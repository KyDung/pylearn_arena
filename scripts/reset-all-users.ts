// Script để reset password cho tất cả tài khoản mẫu
import bcrypt from "bcryptjs";
import pool from "../src/lib/db";

async function resetAllUsers() {
  console.log("🔧 Resetting all sample accounts...\n");

  try {
    // Password mới cho tất cả accounts
    const newPassword = "123456";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("🔐 New password hash created");
    console.log("📝 Password for all accounts:", newPassword);

    // Update admin account
    const [adminResult] = (await pool.query(
      `UPDATE users SET password = ?, role = ? WHERE username = ?`,
      [hashedPassword, "admin", "admin"],
    )) as any;

    if (adminResult.affectedRows > 0) {
      console.log("\n✅ admin - Password updated, role set to 'admin'");
    } else {
      // Create admin if not exists
      await pool.query(
        `INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
        [
          "admin",
          hashedPassword,
          "admin@pylearn.com",
          "Administrator",
          "admin",
        ],
      );
      console.log("\n✅ admin - Account created with role 'admin'");
    }

    // Update student1 account
    const [student1Result] = (await pool.query(
      `UPDATE users SET password = ? WHERE username = ?`,
      [hashedPassword, "student1"],
    )) as any;

    if (student1Result.affectedRows > 0) {
      console.log("✅ student1 - Password updated");
    } else {
      // Create student1 if not exists
      await pool.query(
        `INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
        [
          "student1",
          hashedPassword,
          "student1@pylearn.com",
          "Học Viên 1",
          "student",
        ],
      );
      console.log("✅ student1 - Account created with role 'student'");
    }

    // Show all current users
    const [users] = (await pool.query(
      "SELECT id, username, role, email FROM users",
    )) as any;
    console.log("\n📋 Current accounts in database:");
    console.log("─".repeat(50));
    users.forEach((u: any) => {
      console.log(
        `   ${u.username.padEnd(15)} | ${u.role.padEnd(10)} | ${u.email || "N/A"}`,
      );
    });

    console.log("\n" + "═".repeat(50));
    console.log("🎉 All accounts reset successfully!");
    console.log("═".repeat(50));
    console.log("\n📝 Login credentials:");
    console.log("   ┌─────────────────────────────────────┐");
    console.log("   │  Username     │  Password  │  Role  │");
    console.log("   ├─────────────────────────────────────┤");
    console.log("   │  admin        │  123456    │  admin │");
    console.log("   │  student1     │  123456    │ student│");
    console.log("   └─────────────────────────────────────┘");
    console.log("\n🚀 Try logging in now at http://localhost:3000/login");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetAllUsers();
