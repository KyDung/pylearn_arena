import bcrypt from "bcryptjs";
import pool from "../src/lib/db";

async function updatePasswords() {
  try {
    console.log("🔄 Generating new password hashes...");

    const password = "123456";
    const hash = await bcrypt.hash(password, 10);

    console.log("New hash for '123456':", hash);

    console.log("\n🔄 Updating passwords in database...");
    const client = await pool.connect();

    await client.query(
      "UPDATE users SET password = $1 WHERE username IN ('admin', 'testuser')",
      [hash],
    );

    console.log("✅ Passwords updated successfully!");

    // Verify
    const result = await client.query("SELECT username, password FROM users");
    console.log("\n📋 Updated users:");
    console.log(result.rows);

    client.release();
    await pool.end();

    // Test bcrypt
    console.log("\n🔄 Testing new hash...");
    const isValid = await bcrypt.compare(password, hash);
    console.log("Password match:", isValid);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updatePasswords();
