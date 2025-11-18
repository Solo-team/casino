import { GameResult } from "../../domain/entities/GameResult";
import { IGameResultRepository } from "../../domain/interfaces/IGameResultRepository";

export class InMemoryGameResultRepository implements IGameResultRepository {
  private results: GameResult[] = [];

  async save(result: GameResult): Promise<void> {
    this.results.push(result);
  }

  async findByUserId(userId: string): Promise<GameResult[]> {
    return this.results.filter(r => r.userId === userId);
  }

  async getAll(): Promise<GameResult[]> {
    return [...this.results];
  }
}
