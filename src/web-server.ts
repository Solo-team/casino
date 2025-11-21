import "reflect-metadata";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { CasinoService } from "./application/services/CasinoService";
import { BlackjackGame } from "./domain/games/BlackjackGame";
import { RouletteGame } from "./domain/games/RouletteGame";
import { SlotMachineGame } from "./domain/games/SlotMachineGame";
import { ProviderA } from "./domain/providers/ProviderA";
import { ProviderB } from "./domain/providers/ProviderB";
import { createApiRouter } from "./presentation/web/routes/api";
import { AppDataSource } from "./infrastructure/database/data-source";
import { TypeOrmUserRepository } from "./infrastructure/repositories/TypeOrmUserRepository";
import { TypeOrmGameResultRepository } from "./infrastructure/repositories/TypeOrmGameResultRepository";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const clientDistPath = path.join(__dirname, "../client/dist");

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const initializeDataSourceWithRetry = async (
  retries = 3,
  delayMs = 2000
): Promise<void> => {
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      if (AppDataSource.isInitialized) {
        return;
      }

      await AppDataSource.initialize();
      console.log("Connected to Neon PostgreSQL");
      return;
    } catch (error) {
      const isLastAttempt = attempt === retries + 1;
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Database connection failed (attempt ${attempt}/${retries + 1}): ${message}`);

      if (isLastAttempt) {
        throw error;
      }

      console.log(`Retrying database connection in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
};

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.static(clientDistPath));

const bootstrap = async (): Promise<void> => {
  try {
    await initializeDataSourceWithRetry();

    const userRepository = new TypeOrmUserRepository();
    const gameResultRepository = new TypeOrmGameResultRepository();

    const games = [
      new BlackjackGame(),
      new RouletteGame(),
      new SlotMachineGame()
    ];

    const slotProviders = [
      new ProviderA(),
      new ProviderB()
    ];

    const casinoService = new CasinoService(
      userRepository,
      gameResultRepository,
      games,
      slotProviders
    );

    app.use("/api", createApiRouter(casinoService));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

void bootstrap();
