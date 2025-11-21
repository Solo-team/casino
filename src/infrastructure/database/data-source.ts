import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";
import { UserOrmEntity } from "./entities/UserOrmEntity";
import { GameResultOrmEntity } from "./entities/GameResultOrmEntity";
import { PaymentTransactionOrmEntity } from "./entities/PaymentTransactionOrmEntity";

dotenv.config();

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const createDataSourceOptions = (): DataSourceOptions => {
  const synchronize = parseBoolean(process.env.DB_SYNCHRONIZE, false);
  const logging = parseBoolean(process.env.DB_LOGGING, false);
  const sslEnabled = parseBoolean(process.env.DB_SSL_ENABLED, true);
  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required. Please provide Neon connection string.");
  }

  return {
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize,
    logging,
    entities: [UserOrmEntity, GameResultOrmEntity, PaymentTransactionOrmEntity],
    ssl: sslEnabled ? { rejectUnauthorized } : false
  };
};

export const AppDataSource = new DataSource(createDataSourceOptions());
