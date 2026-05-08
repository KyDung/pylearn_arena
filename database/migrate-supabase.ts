import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const content = await fs.readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] ??= value;
    }
  } catch {
    // .env.local is optional; deployment environments provide real env vars.
  }
}

async function main() {
  await loadLocalEnv();

  const connectionString =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL environment variable.",
    );
  }

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
