import "reflect-metadata";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

async function clearDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Get all user tables in public schema
    const res = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%';`
    );

    const tables: string[] = res.rows.map(r => r.tablename).filter(Boolean);

    if (tables.length === 0) {
      console.log("No tables found to truncate.");
      return;
    }

    // Build truncate statement
    const tableList = tables.map(t => `\"${t}\"`).join(", ");
    const sql = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`;

    console.log("Truncating tables:", tables.join(", "));
    await client.query(sql);
    console.log("Truncate completed. All data removed and sequences reset.");
  } catch (err) {
    console.error("Failed to clear database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearDatabase();
