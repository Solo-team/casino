import { Router, Request, Response } from "express";
import { CasinoService } from "../../../application/services/CasinoService";

export function createApiRouter(casinoService: CasinoService): Router {
  const router = Router();

  // Users
  router.post("/users", async (req: Request, res: Response) => {
    try {
      const { name, initialBalance } = req.body;
      const user = await casinoService.createUser(name, initialBalance || 1000);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await casinoService.getUser(req.params.id);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  router.get("/users/name/:name", async (req: Request, res: Response) => {
    try {
      const user = await casinoService.getUserByName(req.params.name);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/users/:id/deposit", async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      const user = await casinoService.deposit(req.params.id, amount);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Games
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

  // Slot Providers
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

  // Play Game
  router.post("/play", async (req: Request, res: Response) => {
    try {
      const { userId, gameId, betAmount, gameData } = req.body;
      const result = await casinoService.playGame(userId, gameId, betAmount, gameData);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // History
  router.get("/users/:id/history", async (req: Request, res: Response) => {
    try {
      const history = await casinoService.getUserHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
