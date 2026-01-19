import pool from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function updateDatabase() {
  console.log("🔧 Updating database structure...\n");

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "schema-new-structure.sql"),
      "utf-8",
    );

    await pool.query(sql);
    console.log("✅ Database structure updated successfully!");
    console.log("\n📊 New structure:");
    console.log("  - topics table created");
    console.log("  - lessons table updated with topic_id");
    console.log("  - games table created");
    console.log("  - user_progress table updated");
    console.log("\n📝 Sample data added:");
    console.log("  - Topic: Chủ đề F");
    console.log("  - Lesson: Bài 12");
    console.log("  - 4 games added");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

updateDatabase();
