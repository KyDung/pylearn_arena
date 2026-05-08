import pool from "../src/lib/db";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log("🔄 Đang chạy migration: add max_submissions...");

    const sql = fs.readFileSync(
      path.join(__dirname, "migrations/001-add-max-submissions-contests.sql"),
      "utf8",
    );

    // Split by semicolon and run each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log("✅ Executed:", statement.substring(0, 60) + "...");
      } catch (err: any) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log("⚠️  Column already exists, skipping...");
        } else if (err.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("⚠️  Table already exists, skipping...");
        } else {
          console.error("❌ Error:", err.message);
        }
      }
    }

    console.log("✅ Migration completed!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
