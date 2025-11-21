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
