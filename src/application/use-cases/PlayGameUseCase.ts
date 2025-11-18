import { GameResult } from "../../domain/entities/GameResult";
import { CasinoService } from "../services/CasinoService";

export class PlayGameUseCase {
  constructor(private casinoService: CasinoService) {}

  async execute(
    userId: string,
    gameId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult> {
    return this.casinoService.playGame(userId, gameId, betAmount, gameData);
  }
}
