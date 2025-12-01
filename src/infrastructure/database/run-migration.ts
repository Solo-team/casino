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

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`Running migration ${file}...`);
      const sql = fs.readFileSync(migrationPath, "utf8");

      // If the SQL contains CREATE INDEX CONCURRENTLY we should run it as-is.
      await client.query(sql);
      console.log(`Migration ${file} applied.`);
    }

    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
