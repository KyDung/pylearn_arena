/**
 * Script chạy migration cho Sessions và Contests
 * Usage: npx tsx database/run-sessions-contests-migration.ts
 */
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "1900100co",
    database: process.env.MYSQL_DATABASE || "pylearn_arena",
    multipleStatements: true, // Allow multiple SQL statements
  });

  try {
    console.log("🚀 Bắt đầu migration Sessions & Contests...\n");

    // Đọc file SQL
    const sqlPath = path.join(__dirname, "schema-sessions-contests.sql");
    let sql = fs.readFileSync(sqlPath, "utf8");

    // Remove delimiter statements vì mysql2 không hỗ trợ
    sql = sql.replace(/DELIMITER\s+\/\//g, "");
    sql = sql.replace(/DELIMITER\s+;/g, "");
    sql = sql.replace(/\/\//g, ";");

    // Chia thành các statements riêng (không chạy triggers vì phức tạp)
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.includes("CREATE TRIGGER"));

    // Chạy từng statement
    for (const statement of statements) {
      if (statement.includes("CREATE TABLE")) {
        const tableName = statement.match(
          /CREATE TABLE IF NOT EXISTS (\w+)/,
        )?.[1];
        console.log(`📦 Creating table: ${tableName || "unknown"}...`);
        try {
          await pool.query(statement);
          console.log(`   ✅ Done`);
        } catch (err: any) {
          if (err.code === "ER_TABLE_EXISTS_ERROR") {
            console.log(`   ⚠️  Table already exists`);
          } else {
            console.error(`   ❌ Error: ${err.message}`);
          }
        }
      }
    }

    console.log("\n✅ Migration hoàn tất!");

    // Kiểm tra các tables đã được tạo
    const [tables] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE '%session%' OR SHOW TABLES LIKE '%contest%'",
    );

    const [sessionTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'sessions'",
    );
    const [contestTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'contests'",
    );
    const [contestGamesTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'contest_games'",
    );
    const [contestSubmissionsTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'contest_submissions'",
    );
    const [sessionSubmissionsTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'session_submissions'",
    );
    const [contestRankingsTable] = await pool.query<mysql.RowDataPacket[]>(
      "SHOW TABLES LIKE 'contest_rankings'",
    );

    console.log("\n📊 Tables status:");
    console.log(
      `   sessions:             ${sessionTable.length > 0 ? "✅" : "❌"}`,
    );
    console.log(
      `   session_submissions:  ${sessionSubmissionsTable.length > 0 ? "✅" : "❌"}`,
    );
    console.log(
      `   contests:             ${contestTable.length > 0 ? "✅" : "❌"}`,
    );
    console.log(
      `   contest_games:        ${contestGamesTable.length > 0 ? "✅" : "❌"}`,
    );
    console.log(
      `   contest_submissions:  ${contestSubmissionsTable.length > 0 ? "✅" : "❌"}`,
    );
    console.log(
      `   contest_rankings:     ${contestRankingsTable.length > 0 ? "✅" : "❌"}`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
