import "reflect-metadata";
import dotenv from "dotenv";
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const migrationPath = path.join(__dirname, "migrations/001_add_oauth_fields.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Running migration...");
    await client.query(sql);
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
