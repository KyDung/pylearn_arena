// Script để test kết nối MySQL
import pool, { testConnection } from "../src/lib/db-mysql";

async function main() {
  console.log("🔍 Testing MySQL connection...\n");

  const isConnected = await testConnection();

  if (isConnected) {
    try {
      // Test query
      const [rows] = await pool.query("SELECT VERSION() as version");
      console.log("📊 MySQL Version:", (rows as any)[0].version);

      // Kiểm tra database
      const [dbs] = await pool.query("SELECT DATABASE() as db");
      console.log(
        "🗄️  Current Database:",
        (rows as any)[0].db || "pylearn_arena",
      );

      // Kiểm tra tables
      const [tables] = await pool.query("SHOW TABLES");
      console.log("\n📋 Tables:");
      if (Array.isArray(tables) && tables.length > 0) {
        tables.forEach((table: any) => {
          console.log("  -", Object.values(table)[0]);
        });
      } else {
        console.log("  (No tables found - run mysql-schema.sql first)");
      }

      console.log("\n✅ All tests passed!");
    } catch (error) {
      console.error("\n❌ Error during testing:", error);
    }
  } else {
    console.log("\n❌ Connection test failed!");
    console.log("💡 Make sure:");
    console.log("   1. MySQL Server is running");
    console.log('   2. Database "pylearn_arena" exists');
    console.log("   3. Password is correct: 1900100co");
  }

  await pool.end();
  process.exit(0);
}

main();
