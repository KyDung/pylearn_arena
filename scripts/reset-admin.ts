// Script để tạo lại user admin với password đúng
import bcrypt from "bcryptjs";
import pool from "../src/lib/db";

async function resetAdmin() {
  console.log("🔧 Resetting admin account...\n");

  try {
    // Check current users
    const [users] = (await pool.query(
      "SELECT id, username, role FROM users",
    )) as any;

    console.log("📋 Current users:");
    if (Array.isArray(users) && users.length > 0) {
      users.forEach((u: any) => {
        console.log(`   - ${u.username} (${u.role})`);
      });
    } else {
      console.log("   (No users found)");
    }

    // Hash password
    const password = "123456";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("\n🔐 Creating new password hash...");
    console.log("Password:", password);

    // Delete old admin if exists
    await pool.query("DELETE FROM users WHERE username = ?", ["admin"]);

    // Insert new admin
    await pool.query(
      `INSERT INTO users (username, password, email, full_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        "admin",
        hashedPassword,
        "admin@pylearn.com",
        "Administrator",
        "teacher",
      ],
    );

    console.log("\n✅ Admin account created successfully!");
    console.log("\n📝 Login credentials:");
    console.log("   Username: admin");
    console.log("   Password: 123456");
    console.log("\n🚀 Try logging in now!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetAdmin();
