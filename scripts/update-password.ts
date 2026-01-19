// Script để update password cho user
import bcrypt from "bcryptjs";
import pool from "../src/lib/db";

async function updatePassword() {
  const username = "admin";
  const newPassword = "123456";

  console.log("🔐 Updating password...\n");

  try {
    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update vào database
    await pool.query("UPDATE users SET password = ? WHERE username = ?", [
      hashedPassword,
      username,
    ]);

    console.log("✅ Password updated successfully!");
    console.log(`\n📝 New credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log("\n🔑 You can now login with these credentials!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updatePassword();
