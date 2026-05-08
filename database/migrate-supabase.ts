import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL environment variable.",
  );
}

async function main() {
  const schemaPath = path.join(process.cwd(), "database", "supabase", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.SUPABASE_DB_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log("Supabase schema migrated successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to migrate Supabase schema:");
  console.error(error);
  process.exit(1);
});
