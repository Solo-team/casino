import { EntityManager, Repository } from "typeorm";
import { User, AuthProvider } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/interfaces/IUserRepository";
import { AppDataSource } from "../database/data-source";
import { UserOrmEntity } from "../database/entities/UserOrmEntity";

const toDomain = (entity: UserOrmEntity): User =>
  new User(
    entity.id,
    entity.name,
    entity.balance,
    entity.passwordHash || '',
    entity.createdAt,
    entity.email,
    entity.provider as AuthProvider,
    entity.providerId,
    entity.resetToken,
    entity.resetTokenExpiry
  );

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

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? toDomain(entity) : null;
  }

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { provider, providerId } });
    return entity ? toDomain(entity) : null;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { resetToken: token } });
    return entity ? toDomain(entity) : null;
  }

  async save(user: User): Promise<void> {
    await this.repository.save({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash || null,
      provider: user.provider,
      providerId: user.providerId,
      balance: user.balance,
      resetToken: user.resetToken,
      resetTokenExpiry: user.resetTokenExpiry,
      createdAt: user.createdAt
    });
  }

  async saveWithManager(manager: EntityManager, user: User): Promise<void> {
    const repo = manager.getRepository(UserOrmEntity);
    await repo.save({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash || null,
      provider: user.provider,
      providerId: user.providerId,
      balance: user.balance,
      resetToken: user.resetToken,
      resetTokenExpiry: user.resetTokenExpiry,
      createdAt: user.createdAt
    });
  }

  async getAll(): Promise<User[]> {
    const entities = await this.repository.find({ order: { createdAt: "DESC" } });
    return entities.map(toDomain);
  }
}
