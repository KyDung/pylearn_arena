import mysql from "mysql2/promise";

async function showStructure() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log("📚 CẤU TRÚC KHÓA HỌC/BÀI/GAME\n");
  console.log("=".repeat(80));

  // Courses
  const [courses] = await connection.execute(
    "SELECT id, slug, title, is_published FROM courses",
  );
  console.log("\n🎓 COURSES:");
  console.table(courses);

  // Topics
  const [topics] = await connection.execute(
    "SELECT t.id, t.course_id, t.slug, t.title, c.slug as course_slug FROM topics t JOIN courses c ON t.course_id = c.id",
  );
  console.log("\n📖 TOPICS:");
  console.table(topics);

  // Lessons
  const [lessons] = await connection.execute(
    "SELECT l.id, l.topic_id, l.slug, l.title, t.slug as topic_slug FROM lessons l JOIN topics t ON l.topic_id = t.id",
  );
  console.log("\n📝 LESSONS:");
  console.table(lessons);

  // Games
  const [games] = await connection.execute(
    "SELECT g.id, g.lesson_id, g.slug, g.title, g.path, l.slug as lesson_slug FROM games g JOIN lessons l ON g.lesson_id = l.id",
  );
  console.log("\n🎮 GAMES:");
  console.table(games);

  console.log("\n" + "=".repeat(80));
  console.log("📊 QUAN HỆ:");
  console.log("Course → Topics → Lessons → Games");
  console.log("=".repeat(80));

  await connection.end();
}

showStructure().catch(console.error);
