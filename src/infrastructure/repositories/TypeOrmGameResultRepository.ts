import { EntityManager, Repository } from "typeorm";
import { GameResult, GameResultType } from "../../domain/entities/GameResult";
import { IGameResultRepository } from "../../domain/interfaces/IGameResultRepository";
import { AppDataSource } from "../database/data-source";
import { GameResultOrmEntity } from "../database/entities/GameResultOrmEntity";

export class TypeOrmGameResultRepository implements IGameResultRepository {
  private repository: Repository<GameResultOrmEntity>;

  constructor(dataSource = AppDataSource) {
    if (!dataSource.isInitialized) {
      throw new Error("DataSource is not initialized. Call AppDataSource.initialize() first.");
    }
    this.repository = dataSource.getRepository(GameResultOrmEntity);
  }

  async save(result: GameResult): Promise<void> {
    const entity = this.repository.create({
      gameId: result.gameId,
      userId: result.userId,
      gameType: result.gameType,
      betAmount: result.betAmount,
      resultType: result.resultType,
      payout: result.payout,
      gameData: result.gameData,
      timestamp: result.timestamp
    });
    await this.repository.save(entity);
  }

  async saveWithManager(manager: EntityManager, result: GameResult): Promise<void> {
    const repo = manager.getRepository(GameResultOrmEntity);
    const entity = repo.create({
      gameId: result.gameId,
      userId: result.userId,
      gameType: result.gameType,
      betAmount: result.betAmount,
      resultType: result.resultType,
      payout: result.payout,
      gameData: result.gameData,
      timestamp: result.timestamp
    });
    await repo.save(entity);
  }

  async findByUserId(userId: string): Promise<GameResult[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { timestamp: "DESC" }
    });
    return entities.map(e => this.toDomain(e));
  }

  async getAll(): Promise<GameResult[]> {
    const entities = await this.repository.find({
      order: { timestamp: "DESC" }
    });
    return entities.map(e => this.toDomain(e));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId }
    });
  }

  private toDomain(entity: GameResultOrmEntity): GameResult {
    return new GameResult(
      entity.gameId,
      entity.userId,
      entity.gameType,
      Number(entity.betAmount),
      entity.resultType as GameResultType,
      Number(entity.payout),
      entity.gameData || {},
      entity.timestamp
    );
  }
}
