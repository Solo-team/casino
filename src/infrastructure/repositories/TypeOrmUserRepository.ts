import { EntityManager, Repository } from "typeorm";
import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { AppDataSource } from "../database/data-source";
import { UserOrmEntity } from "../database/entities/UserOrmEntity";

const toDomain = (entity: UserOrmEntity): User =>
  new User(entity.id, entity.name, entity.balance, entity.passwordHash, entity.createdAt);

export class TypeOrmUserRepository implements IUserRepository {
  private readonly repository: Repository<UserOrmEntity>;

  constructor(dataSource = AppDataSource) {
    if (!dataSource.isInitialized) {
      throw new Error("Data source must be initialized before creating repositories");
    }
    this.repository = dataSource.getRepository(UserOrmEntity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? toDomain(entity) : null;
  }

  async findByName(name: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { name } });
    return entity ? toDomain(entity) : null;
  }

  async save(user: User): Promise<void> {
    await this.repository.save({
      id: user.id,
      name: user.name,
      passwordHash: user.passwordHash,
      balance: user.balance,
      createdAt: user.createdAt
    });
  }

  async saveWithManager(manager: EntityManager, user: User): Promise<void> {
    const repo = manager.getRepository(UserOrmEntity);
    await repo.save({
      id: user.id,
      name: user.name,
      passwordHash: user.passwordHash,
      balance: user.balance,
      createdAt: user.createdAt
    });
  }

  async getAll(): Promise<User[]> {
    const entities = await this.repository.find({ order: { createdAt: "DESC" } });
    return entities.map(toDomain);
  }
}
