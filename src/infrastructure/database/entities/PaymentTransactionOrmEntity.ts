import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { PaymentMethod, PaymentStatus, PaymentType } from "../../../domain/entities/PaymentTransaction";

const toNumeric = (value?: number | string | null): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return value;
};

@Entity({ name: "payments" })
@Index(["userId", "createdAt"])
export class PaymentTransactionOrmEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 64 })
  @Index()
  userId!: string;

  @Column({ type: "varchar", length: 16 })
  type!: PaymentType;

  @Column({ type: "varchar", length: 16 })
  method!: PaymentMethod;

  @Column({ type: "varchar", length: 64 })
  provider!: string;

  @Column({ name: "provider_payment_id", type: "varchar", length: 128, nullable: true })
  providerPaymentId?: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: {
      to: (value?: number): number => Number(value ?? 0),
      from: (value: string | number | null): number => toNumeric(value)
    }
  })
  amount!: number;

  @Column({ type: "varchar", length: 12 })
  currency!: string;

  @Column({ type: "varchar", length: 16 })
  status!: PaymentStatus;

  @Column({ type: "varchar", length: 200, nullable: true })
  address?: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  memo?: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  network?: string;

  @Column({ name: "tx_hash", type: "varchar", length: 140, nullable: true })
  txHash?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt?: Date | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt?: Date | null;
}
