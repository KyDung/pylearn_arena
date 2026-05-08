import bcrypt from "bcryptjs";
import pool from "../src/lib/db";

async function checkAdmin() {
  try {
    console.log("🔍 Checking admin account...\n");

    // Get admin user
    const [rows] = (await pool.query(
      "SELECT id, username, password, full_name, email, role, status FROM users WHERE username = ?",
      ["admin"],
    )) as any;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("❌ Admin account not found");
      return;
    }

    const admin = rows[0];
    console.log("📋 Admin Account Details:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Full Name: ${admin.full_name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.status}`);
    console.log(`   Password Hash: ${admin.password.substring(0, 30)}...`);

    // Test password
    const testPassword = "123456";
    const isValidPassword = await bcrypt.compare(testPassword, admin.password);
    console.log(
      `\n🔐 Password Test (123456): ${isValidPassword ? "✅ CORRECT" : "❌ WRONG"}`,
    );

    if (!isValidPassword) {
      console.log("\n⚠️  Password 123456 doesn't match!");
      console.log("Trying to re-hash and update...");

      const hashedPassword = await bcrypt.hash("123456", 10);
      await pool.query(
        "UPDATE users SET password = ?, status = ? WHERE username = ?",
        [hashedPassword, "active", "admin"],
      );
      console.log("✅ Password updated and status set to 'active'");
    } else {
      // Check status
      if (admin.status !== "active") {
        console.log(`\n⚠️  Account status is '${admin.status}', not 'active'`);
        console.log("Updating status to 'active'...");
        await pool.query("UPDATE users SET status = ? WHERE username = ?", [
          "active",
          "admin",
        ]);
        console.log("✅ Status updated");
      } else {
        console.log("\n✅ Everything looks good! Account should work.");
      }
    }

    console.log("\n📝 Try logging in with:");
    console.log("   Username: admin");
    console.log("   Password: 123456");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkAdmin();
