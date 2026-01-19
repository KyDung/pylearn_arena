import pool from "../src/lib/db";
import fs from "fs";
import path from "path";

async function initDatabase() {
  try {
    console.log("🔄 Đang kết nối database...");

    // Test connection
    const client = await pool.connect();
    console.log("✅ Kết nối database thành công!");

    // Read SQL schema
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    console.log("🔄 Đang tạo bảng và dữ liệu mẫu...");

    // Execute schema
    await client.query(schema);

    console.log("✅ Database đã được khởi tạo thành công!");
    console.log("\n📋 Tài khoản mẫu:");
    console.log("   Admin: admin / 123456");
    console.log("   Student: testuser / 123456");

    client.release();
    await pool.end();
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo database:", error);
    process.exit(1);
  }
}

initDatabase();
