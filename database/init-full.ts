import pool from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

async function initDatabase() {
  console.log("🚀 Initializing database...\n");

  try {
    // Đọc và chạy schema users
    console.log("📝 Creating users table...");
    const usersSchema = fs.readFileSync(
      path.join(__dirname, "schema.sql"),
      "utf-8",
    );
    await pool.query(usersSchema);
    console.log("✅ Users table created\n");

    // Đọc và chạy schema courses
    console.log("📝 Creating courses and lessons tables...");
    const coursesSchema = fs.readFileSync(
      path.join(__dirname, "schema-courses.sql"),
      "utf-8",
    );
    await pool.query(coursesSchema);
    console.log("✅ Courses and lessons tables created\n");

    console.log("🎉 Database initialization completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

initDatabase();
