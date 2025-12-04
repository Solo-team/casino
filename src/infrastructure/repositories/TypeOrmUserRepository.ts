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
    entity.resetTokenExpiry,
    entity.emailVerified,
    entity.emailVerificationToken,
    entity.emailVerificationExpiry,
    entity.isAdmin
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

  async findByVerificationToken(token: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { emailVerificationToken: token } });
    return entity ? toDomain(entity) : null;
  }

  async save(user: User): Promise<void> {
    // Для админов не обновляем баланс - оставляем как есть в БД
    if (user.isAdmin) {
      const existing = await this.repository.findOne({ where: { id: user.id } });
      const balanceToSave = existing?.balance ?? 999999999;
      await this.repository.save({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash || null,
        provider: user.provider,
        providerId: user.providerId,
        balance: balanceToSave,
        resetToken: user.resetToken,
        resetTokenExpiry: user.resetTokenExpiry,
        emailVerified: (user as any).emailVerified ?? false,
        emailVerificationToken: (user as any).emailVerificationToken ?? null,
        emailVerificationExpiry: (user as any).emailVerificationExpiry ?? null,
        isAdmin: true,
        createdAt: user.createdAt
      });
      return;
    }
    
    await this.repository.save({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash || null,
      provider: user.provider,
      providerId: user.providerId,
      balance: (user as any)._balance ?? user.balance,
      resetToken: user.resetToken,
      resetTokenExpiry: user.resetTokenExpiry,
      emailVerified: (user as any).emailVerified ?? false,
      emailVerificationToken: (user as any).emailVerificationToken ?? null,
      emailVerificationExpiry: (user as any).emailVerificationExpiry ?? null,
      isAdmin: user.isAdmin ?? false,
      createdAt: user.createdAt
    });
  }

  async saveWithManager(manager: EntityManager, user: User): Promise<void> {
    const repo = manager.getRepository(UserOrmEntity);
    
    // Для админов не обновляем баланс
    if (user.isAdmin) {
      const existing = await repo.findOne({ where: { id: user.id } });
      const balanceToSave = existing?.balance ?? 999999999;
      await repo.save({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash || null,
        provider: user.provider,
        providerId: user.providerId,
        balance: balanceToSave,
        resetToken: user.resetToken,
        resetTokenExpiry: user.resetTokenExpiry,
        emailVerified: (user as any).emailVerified ?? false,
        emailVerificationToken: (user as any).emailVerificationToken ?? null,
        emailVerificationExpiry: (user as any).emailVerificationExpiry ?? null,
        isAdmin: true,
        createdAt: user.createdAt
      });
      return;
    }
    
    await repo.save({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash || null,
      provider: user.provider,
      providerId: user.providerId,
      balance: (user as any)._balance ?? user.balance,
      resetToken: user.resetToken,
      resetTokenExpiry: user.resetTokenExpiry,
      emailVerified: (user as any).emailVerified ?? false,
      emailVerificationToken: (user as any).emailVerificationToken ?? null,
      emailVerificationExpiry: (user as any).emailVerificationExpiry ?? null,
      isAdmin: user.isAdmin ?? false,
      createdAt: user.createdAt
    });
  }

  async getAll(): Promise<User[]> {
    const entities = await this.repository.find({ order: { createdAt: "DESC" } });
    return entities.map(toDomain);
  }
}
