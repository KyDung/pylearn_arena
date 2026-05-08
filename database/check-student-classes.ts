import pool from "../src/lib/db";

async function checkStudentClasses() {
  try {
    console.log("🔍 Kiểm tra học sinh và lớp học...\n");

    // Lấy danh sách học sinh
    const [students] = await pool.query(`
      SELECT id, username, full_name, role
      FROM users
      WHERE role = 'student'
      LIMIT 5
    `);

    console.log("👨‍🎓 Học sinh:");
    console.table(students);

    // Lấy lớp học của học sinh đầu tiên
    if (Array.isArray(students) && students.length > 0) {
      const studentId = (students as any)[0].id;
      console.log(`\n🔍 Kiểm tra lớp của học sinh ID ${studentId}:`);

      const [classes] = await pool.query(
        `
        SELECT 
          c.id,
          c.name,
          cm.status
        FROM class_members cm
        JOIN classes c ON cm.class_id = c.id
        WHERE cm.user_id = ?
      `,
        [studentId],
      );

      console.table(classes);

      if (Array.isArray(classes) && classes.length === 0) {
        console.log("\n⚠️  HỌC SINH CHƯA ĐƯỢC THÊM VÀO LỚP NÀO!");
        console.log(
          "💡 Hãy vào Teacher Dashboard → Quản lý lớp học → Thêm học sinh vào lớp",
        );
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkStudentClasses();
