import pool from "../src/lib/db";

async function checkTable() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM sessions");
    console.log("📋 Cấu trúc bảng sessions:");
    console.table(columns);
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkTable();
