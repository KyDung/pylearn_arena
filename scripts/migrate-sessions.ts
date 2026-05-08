import pool from "../src/lib/db";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log("🔄 Running sessions migration...");

    const sqlPath = path.join(__dirname, "../database/schema-sessions.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log("✅ Sessions migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
