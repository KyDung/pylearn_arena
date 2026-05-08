import pool from "../src/lib/db";

async function addStudentToClass() {
  try {
    console.log("➕ Thêm học sinh vào lớp 10A2...\n");

    // Lấy ID của lớp 10A2
    const [classes] = await pool.query(`
      SELECT id, name FROM classes WHERE name = '10A2'
    `);

    if (!Array.isArray(classes) || classes.length === 0) {
      console.log("❌ Không tìm thấy lớp 10A2!");
      process.exit(1);
    }

    const classId = (classes as any)[0].id;
    console.log(`✅ Tìm thấy lớp 10A2 (ID: ${classId})`);

    // Lấy danh sách học sinh
    const [students] = await pool.query(`
      SELECT id, username, full_name FROM users WHERE role = 'student' LIMIT 5
    `);

    console.log("\n👨‍🎓 Thêm học sinh vào lớp:");

    for (const student of students as any[]) {
      try {
        await pool.query(
          `
          INSERT INTO class_members (class_id, user_id, status)
          VALUES (?, ?, 'active')
          ON DUPLICATE KEY UPDATE status = 'active'
        `,
          [classId, student.id],
        );

        console.log(`  ✅ ${student.username} (${student.full_name})`);
      } catch (err) {
        console.log(`  ⚠️  ${student.username} - đã có trong lớp`);
      }
    }

    console.log("\n🎉 Hoàn thành! Giờ học sinh có thể thấy sessions rồi!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addStudentToClass();
