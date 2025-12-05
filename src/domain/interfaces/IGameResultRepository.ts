import { GameResult } from "../entities/GameResult";

export interface IGameResultRepository {
  save(result: GameResult): Promise<void>;
  findByUserId(userId: string): Promise<GameResult[]>;
  getAll(): Promise<GameResult[]>;
  countByUserId(userId: string): Promise<number>;
}
