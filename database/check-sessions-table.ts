import pool from "../src/lib/db";

import { getErrorMessage } from "@/lib/errors";
async function checkTable() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM sessions");
    console.log("📋 Cấu trúc bảng sessions:");
    console.table(columns);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", getErrorMessage(error));
    process.exit(1);
  }
}

checkTable();
