import { EntityManager, Repository } from "typeorm";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  PaymentType
} from "../../domain/entities/PaymentTransaction";
import { IPaymentRepository } from "../../domain/interfaces/IPaymentRepository";
import { AppDataSource } from "../database/data-source";
import { PaymentTransactionOrmEntity } from "../database/entities/PaymentTransactionOrmEntity";

const toDomain = (entity: PaymentTransactionOrmEntity): PaymentTransaction =>
  new PaymentTransaction(
    entity.id,
    entity.userId,
    entity.amount,
    entity.currency,
    entity.type,
    entity.method,
    entity.provider,
    entity.providerPaymentId ?? undefined,
    entity.address ?? undefined,
    entity.memo ?? undefined,
    entity.network ?? undefined,
    entity.status ?? PaymentStatus.PENDING,
    entity.metadata ?? {},
    entity.createdAt,
    entity.updatedAt,
    entity.expiresAt ?? null,
    entity.txHash ?? null,
    entity.completedAt ?? null
  );

const toOrm = (payment: PaymentTransaction): PaymentTransactionOrmEntity => {
  const entity = new PaymentTransactionOrmEntity();
  entity.id = payment.id;
  entity.userId = payment.userId;
  entity.amount = payment.amount;
  entity.currency = payment.currency;
  entity.type = payment.type ?? PaymentType.DEPOSIT;
  entity.method = payment.method ?? PaymentMethod.CRYPTO;
  entity.provider = payment.provider;
  entity.providerPaymentId = payment.providerPaymentId;
  entity.address = payment.address;
  entity.memo = payment.memo;
  entity.network = payment.network;
  entity.status = payment.status;
  entity.txHash = payment.txHash;
  entity.metadata = payment.metadata;
  entity.createdAt = payment.createdAt;
  entity.updatedAt = payment.updatedAt;
  entity.expiresAt = payment.expiresAt;
  entity.completedAt = payment.completedAt;
  return entity;
};

export class TypeOrmPaymentRepository implements IPaymentRepository {
  private readonly repository: Repository<PaymentTransactionOrmEntity>;

  constructor(dataSource = AppDataSource) {
    if (!dataSource.isInitialized) {
      throw new Error("Data source must be initialized before creating repositories");
    }
    this.repository = dataSource.getRepository(PaymentTransactionOrmEntity);
  }

  async findById(id: string): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? toDomain(entity) : null;
  }

  async findByProviderPaymentId(providerPaymentId: string): Promise<PaymentTransaction | null> {
    const entity = await this.repository.findOne({ where: { providerPaymentId } });
    return entity ? toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<PaymentTransaction[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" }
    });
    return entities.map(toDomain);
  }

  async save(payment: PaymentTransaction): Promise<void> {
    await this.repository.save(toOrm(payment));
  }

  async saveWithManager(manager: EntityManager, payment: PaymentTransaction): Promise<void> {
    const repo = manager.getRepository(PaymentTransactionOrmEntity);
    await repo.save(toOrm(payment));
  }
}
