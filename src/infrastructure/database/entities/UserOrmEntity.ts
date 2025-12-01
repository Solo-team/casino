import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

export type AuthProvider = 'local' | 'google';

const toNumeric = (value?: number | string | null): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return value;
};

@Entity({ name: "users" })
export class UserOrmEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ name: "password_hash", type: "varchar", length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: 'local'
  })
  provider!: AuthProvider;

  @Column({ name: "provider_id", type: "varchar", length: 255, nullable: true })
  @Index()
  providerId!: string | null;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    default: 0,
    transformer: {
      to: (value?: number): number => Number(value ?? 0),
      from: (value: string | number | null): number => toNumeric(value)
    }
  })
  balance!: number;

  @Column({ name: "reset_token", type: "varchar", length: 255, nullable: true })
  resetToken!: string | null;

  @Column({ name: "reset_token_expiry", type: "timestamptz", nullable: true })
  resetTokenExpiry!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
