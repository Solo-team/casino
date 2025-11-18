import { GameResult } from "../entities/GameResult";

export interface IGame {
  readonly name: string;
  readonly id: string;
  
  play(userId: string, betAmount: number, gameData?: Record<string, any>): Promise<GameResult>;
  validateBet(betAmount: number, userBalance: number): boolean;
  getMinBet(): number;
  getMaxBet(): number;
}
