// Script tự động chạy migration MySQL
import pool from "../src/lib/db-mysql";
import fs from "fs";
import path from "path";

async function runMigration() {
  console.log("🚀 Starting MySQL migration...\n");

  try {
    // Đọc file SQL
    const sqlPath = path.join(__dirname, "mysql-schema.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log(`📄 SQL file size: ${sqlContent.length} characters\n`);

    // Loại bỏ comments và tách statements
    const cleanedSql = sqlContent
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim() !== "")
      .join("\n");

    // Tách các câu lệnh SQL theo dấu chấm phẩy
    const statements = cleanedSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    // Chạy từng câu lệnh
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Bỏ qua comments và statements rỗng
      if (statement.startsWith("--") || statement.trim() === "") {
        continue;
      }

      try {
        await pool.query(statement);

        // Hiển thị progress
        if (statement.toLowerCase().includes("create table")) {
          const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.toLowerCase().includes("insert into")) {
          const tableName = statement.match(/INSERT INTO.*?`?(\w+)`?/i)?.[1];
          console.log(`📝 Inserted data into: ${tableName}`);
        }
      } catch (error: any) {
        // Bỏ qua lỗi "table already exists"
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          console.log(`⚠️  Table already exists, skipping...`);
        } else if (error.code === "ER_DUP_ENTRY") {
          console.log(`⚠️  Duplicate entry, skipping...`);
        } else {
          console.error(`❌ Error executing statement:`, error.message);
          console.error("Statement:", statement.substring(0, 100) + "...");
        }
      }
    }

    // Kiểm tra kết quả
    console.log("\n📊 Checking created tables...\n");
    const [tables] = await pool.query("SHOW TABLES");

    if (Array.isArray(tables) && tables.length > 0) {
      console.log("✅ Tables created successfully:");
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [rows] = await pool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`,
        );
        const count = (rows as any)[0].count;
        console.log(`   - ${tableName} (${count} rows)`);
      }
    }

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
