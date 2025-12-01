import { Router, Request, Response } from "express";
import { CasinoService } from "../../../application/services/CasinoService";
import { generateToken } from "../utils/jwt";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

export function createApiRouter(casinoService: CasinoService): Router {
  const router = Router();

  const registerHandler = async (req: Request, res: Response) => {
    try {
      const { name, password, initialBalance } = req.body;
      const user = await casinoService.registerUser(name, password, initialBalance || 1000);
      const token = generateToken({ userId: user.id, name: user.name });
      res.json({ user: user.toJSON(), token });
    } catch (error: any) {
      console.error("Error in register:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  };

  router.post("/users", registerHandler);
  router.post("/auth/register", registerHandler);

  router.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const { name, password } = req.body;
      const user = await casinoService.authenticateUser(name, password);
      const token = generateToken({ userId: user.id, name: user.name });
      res.json({ user: user.toJSON(), token });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Google OAuth login/register
  router.post("/auth/google", async (req: Request, res: Response) => {
    try {
      const { email, name, googleId } = req.body;
      if (!email || !googleId) {
        res.status(400).json({ error: "Email and Google ID are required" });
        return;
      }
      const user = await casinoService.registerOrLoginWithOAuth('google', googleId, email, name || email.split('@')[0]);
      const token = generateToken({ userId: user.id, name: user.name });
      res.json({ user: user.toJSON(), token });
    } catch (error: any) {
      console.error("Error in Google auth:", error);
      res.status(400).json({ error: error.message || "Google authentication failed" });
    }
  });

  // Server-side OAuth: initiate Google OAuth flow (redirect)
  router.get("/auth/google", async (req: Request, res: Response) => {
    try {
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.PORT ? `http://localhost:${process.env.PORT}` : `http://localhost:3000`}/api/auth/google/callback`;
      const scope = encodeURIComponent("openid email profile");
      const state = encodeURIComponent(req.query.state as string || "");

      if (!clientId) {
        res.status(500).json({ error: "Google client ID not configured" });
        return;
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("Error initiating Google OAuth:", error);
      res.status(500).json({ error: "Failed to initiate Google OAuth" });
    }
  });

  // OAuth callback to exchange code for tokens and sign in user
  router.get("/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string | undefined;
      if (!code) {
        res.status(400).send("Missing code");
        return;
      }

      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.PORT ? `http://localhost:${process.env.PORT}` : `http://localhost:3000`}/api/auth/google/callback`;

      if (!clientId || !clientSecret) {
        res.status(500).send("Google OAuth not configured on server");
        return;
      }

      // Exchange code for tokens
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        } as any).toString()
      });

      if (!tokenResp.ok) {
        const text = await tokenResp.text();
        console.error("Token exchange failed:", tokenResp.status, text);
        res.status(500).send("Token exchange failed");
        return;
      }

      const tokenJson = await tokenResp.json() as any;
      const idToken = tokenJson?.id_token as string | undefined;
      let profile: { email?: string; name?: string; sub?: string } | null = null;

      if (idToken) {
        try {
          const parts = idToken.split('.');
          const payload = parts[1];
          const decoded = Buffer.from(payload, 'base64').toString('utf8');
          profile = JSON.parse(decoded);
        } catch (err) {
          console.error('Failed to decode id_token', err);
        }
      }

      if (!profile || !profile.email || !profile.sub) {
        // Try userinfo endpoint as fallback
        if (tokenJson.access_token) {
          const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` }
          });
          if (userResp.ok) {
            profile = await userResp.json() as any;
          }
        }
      }

      if (!profile || !profile.email || !profile.sub) {
        console.error('Failed to obtain profile from Google', profile);
        res.status(500).send('Failed to obtain profile from Google');
        return;
      }

      const user = await casinoService.registerOrLoginWithOAuth('google', profile.sub, profile.email, profile.name || profile.email.split('@')[0]);
      const token = generateToken({ userId: user.id, name: user.name });

      // Redirect back to client with token in query param
      const clientOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
      const redirectTo = `${clientOrigin}?token=${encodeURIComponent(token)}`;
      res.redirect(redirectTo);
    } catch (error: any) {
      console.error('Error in Google callback:', error);
      const clientOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
      const message = error && error.message ? encodeURIComponent(error.message) : 'Google auth failed';
      // Redirect back to client with error message so UI can show it
      res.redirect(`${clientOrigin}?error=${message}`);
    }
  });

  // Logout (client-side token removal, but we can add token blacklist later)
  router.post("/auth/logout", authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
    // For JWT, logout is primarily handled client-side by removing the token
    // Server-side we could implement token blacklisting if needed
    res.json({ message: "Logged out successfully" });
  });

  // Request password reset
  router.post("/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const resetToken = await casinoService.createPasswordResetToken(email);
      
      // In production, you would send an email with the reset link
      // For now, we'll return success regardless of whether email exists (security best practice)
      if (resetToken) {
        // TODO: Send email with reset link
        console.log(`Password reset token for ${email}: ${resetToken}`);
        // In development, we'll return the token (remove in production!)
        if (process.env.NODE_ENV === 'development') {
          res.json({ message: "Password reset email sent", resetToken });
          return;
        }
      }
      
      res.json({ message: "If an account with that email exists, a password reset link has been sent" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reset password with token
  router.post("/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ error: "Token and new password are required" });
        return;
      }

      await casinoService.resetPassword(token, password);
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Change password (for logged in users)
  router.post("/auth/change-password", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current password and new password are required" });
        return;
      }

      await casinoService.changePassword(req.userId, currentPassword, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/users/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await casinoService.getUser(req.userId);
      res.json(user.toJSON());
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  router.post("/users/deposit", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { amount } = req.body;
      const user = await casinoService.deposit(req.userId, amount);
      res.json(user.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/users/history", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const history = await casinoService.getUserHistory(req.userId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/games", async (_req: Request, res: Response) => {
    try {
      const games = casinoService.getAvailableGames();
      res.json(games.map(g => ({
        id: g.id,
        name: g.name,
        minBet: g.getMinBet(),
        maxBet: g.getMaxBet()
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/providers", async (_req: Request, res: Response) => {
    try {
      const providers = casinoService.getSlotProviders();
      res.json(providers.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        gamesCount: p.getGames().length
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/providers/:id/games", async (req: Request, res: Response) => {
    try {
      const providers = casinoService.getSlotProviders();
      const provider = providers.find(p => p.id === req.params.id);
      if (!provider) {
        res.status(404).json({ error: "Provider not found" });
        return;
      }
      res.json(provider.getGames());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/slots", async (_req: Request, res: Response) => {
    try {
      const games = casinoService.getAllSlotGames();
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/play", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { gameId, betAmount, gameData } = req.body;
      const result = await casinoService.playGame(req.userId, gameId, betAmount, gameData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
