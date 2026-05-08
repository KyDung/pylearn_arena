import pool from "../src/lib/db";
import SessionService from "../src/lib/services/sessions";

async function testStudentCoursesAPI() {
  try {
    console.log("🔍 Test API student/courses...\n");

    // Lấy student đầu tiên
    const [students] = await pool.query(`
      SELECT id, username FROM users WHERE role = 'student' LIMIT 1
    `);

    if (!Array.isArray(students) || students.length === 0) {
      console.log("❌ Không tìm thấy học sinh nào!");
      process.exit(1);
    }

    const student = (students as any)[0];
    console.log(
      `👨‍🎓 Test với student: ${student.username} (ID: ${student.id})\n`,
    );

    // Test SessionService
    const activeSessions = await SessionService.getActiveSessionsForStudent(
      student.id,
    );
    console.log(`📊 Active sessions: ${activeSessions.length}`);
    console.table(activeSessions);

    // Test query courses
    const [courses] = await pool.query(
      `
      SELECT DISTINCT 
        c.id,
        c.title,
        c.slug
      FROM courses c
      INNER JOIN course_access ca ON c.id = ca.course_id
      INNER JOIN classes cl ON ca.class_id = cl.id
      INNER JOIN class_members cm ON cl.id = cm.class_id
      WHERE cm.user_id = ? 
        AND cm.status = 'active'
        AND c.is_published = 1
    `,
      [student.id],
    );

    console.log(
      `\n📚 Regular courses: ${Array.isArray(courses) ? courses.length : 0}`,
    );
    console.table(courses);

    console.log("\n✅ API sẽ trả về:");
    console.log(
      `  - 1 Virtual Course: "📝 Bài kiểm tra đang mở" (count: ${activeSessions.length})`,
    );
    console.log(
      `  - ${Array.isArray(courses) ? courses.length : 0} Regular courses`,
    );

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testStudentCoursesAPI();
