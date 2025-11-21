import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

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

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
