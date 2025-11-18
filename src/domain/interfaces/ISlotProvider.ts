import { GameResult } from "../entities/GameResult";

export interface ISlotGame {
  readonly id: string;
  readonly name: string;
  readonly minBet: number;
  readonly maxBet: number;
  readonly description?: string;
  readonly imageUrl?: string;
}

export interface ISlotProvider {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  
  getGames(): ISlotGame[];
  getGame(gameId: string): ISlotGame | null;
  playGame(
    gameId: string,
    userId: string,
    betAmount: number,
    gameData?: Record<string, any>
  ): Promise<GameResult>;
}