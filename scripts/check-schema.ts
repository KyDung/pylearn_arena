import pool from "../src/lib/db";
import type { RowDataPacket } from "@/lib/dbTypes";

async function checkSchema() {
  try {
    console.log("🔍 Checking users table schema...\n");

    const [columns] = await pool.query("DESCRIBE users");
    console.log("📋 Users table columns:");
    console.log(columns);

    const [adminRows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE username = ?",
      ["admin"],
    );

    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      console.log("\n❌ Admin account not found");
    } else {
      console.log("\n✅ Admin account found:");
      console.log(adminRows[0]);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkSchema();
