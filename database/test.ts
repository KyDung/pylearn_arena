import pool from "../src/lib/db";

async function testConnection() {
  try {
    console.log("🔄 Testing database connection...");
    const client = await pool.connect();

    console.log("✅ Connected successfully!");

    // Test query
    // The compatibility layer returns [rows, header], not a pg result object.
    const [rows] = await client.query("SELECT * FROM users");
    console.log("\n📋 Users in database:");
    console.log(rows);

    client.release();
    await pool.end();
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
}

testConnection();
