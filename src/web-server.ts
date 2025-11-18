import express from "express";
import cors from "cors";
import path from "path";
import { InMemoryUserRepository } from "./infrastructure/repositories/InMemoryUserRepository";
import { InMemoryGameResultRepository } from "./infrastructure/repositories/InMemoryGameResultRepository";
import { CasinoService } from "./application/services/CasinoService";
import { BlackjackGame } from "./domain/games/BlackjackGame";
import { RouletteGame } from "./domain/games/RouletteGame";
import { SlotMachineGame } from "./domain/games/SlotMachineGame";
import { ProviderA } from "./domain/providers/ProviderA";
import { ProviderB } from "./domain/providers/ProviderB";
import { createApiRouter } from "./presentation/web/routes/api";

const app = express();
const PORT = process.env.PORT || 3000;
const clientDistPath = path.join(__dirname, "../client/dist");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

// Инициализация зависимостей
const userRepository = new InMemoryUserRepository();
const gameResultRepository = new InMemoryGameResultRepository();

// Создание игр
const games = [
  new BlackjackGame(),
  new RouletteGame(),
  new SlotMachineGame()
];

// Создание провайдеров слотов
const slotProviders = [
  new ProviderA(),
  new ProviderB()
];

// Создание сервиса казино
const casinoService = new CasinoService(
  userRepository,
  gameResultRepository,
  games,
  slotProviders
);

// API Routes
app.use("/api", createApiRouter(casinoService));

// Serve frontend
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🎰 Казино сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 API доступен на http://localhost:${PORT}/api`);
});
