import { GameResult } from "../../domain/entities/GameResult";
import { CasinoService } from "../services/CasinoService";

export class GetUserHistoryUseCase {
  constructor(private casinoService: CasinoService) {}

  async execute(userId: string): Promise<GameResult[]> {
    return this.casinoService.getUserHistory(userId);
  }
}
