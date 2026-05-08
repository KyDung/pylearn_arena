import pool from "../src/lib/db";

async function addMaxSubmissions() {
  try {
    console.log("🔄 Thêm cột max_submissions vào bảng sessions...");

    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN max_submissions INT DEFAULT NULL 
      COMMENT 'Số lần nộp tối đa (NULL = không giới hạn)' 
      AFTER duration_minutes
    `);

    console.log("✅ Đã thêm cột max_submissions!");

    // Verify
    const [columns] = await pool.query(
      "SHOW COLUMNS FROM sessions LIKE 'max_submissions'",
    );
    console.table(columns);

    process.exit(0);
  } catch (error: any) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("⚠️  Cột max_submissions đã tồn tại rồi!");
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
}

addMaxSubmissions();
