import { ISlotProvider, ISlotGame } from "../interfaces/ISlotProvider";
import { GameResult } from "../entities/GameResult";

export abstract class BaseSlotProvider implements ISlotProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description?: string;

  abstract getGames(): ISlotGame[];
  abstract playGame(
    gameId: string,
    userId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult>;

  getGame(gameId: string): ISlotGame | null {
    return this.getGames().find(g => g.id === gameId) || null;
  }

  protected generateGameId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateBet(betAmount: number, game: ISlotGame): boolean {
    return betAmount >= game.minBet && betAmount <= game.maxBet;
  }
}
