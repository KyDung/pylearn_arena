import mysql from "mysql2/promise";

const COURSE_SLUG = process.argv[2];

if (!COURSE_SLUG) {
  console.error("❌ Usage: npx tsx scripts/remove-course.ts <course-slug>");
  console.error("   Example: npx tsx scripts/remove-course.ts python-basics");
  console.error("\n⚠️  WARNING: This will delete the entire course!");
  process.exit(1);
}

async function removeCourse() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log(`\n🗑️  Removing course: ${COURSE_SLUG}\n`);
  console.log("⚠️  WARNING: This will delete everything in the course!");

  // 1. Get course info
  const [courses]: any = await connection.execute(
    "SELECT * FROM courses WHERE slug = ?",
    [COURSE_SLUG],
  );

  if (courses.length === 0) {
    console.log("❌ Course not found in database");
    await connection.end();
    return;
  }

  const course = courses[0];
  console.log(`📋 Found: ${course.title}`);

  // 2. Get all topics in this course
  const [topics]: any = await connection.execute(
    "SELECT * FROM topics WHERE course_id = ?",
    [course.id],
  );

  if (topics.length > 0) {
    console.log(`\n⚠️  This course contains ${topics.length} topic(s):`);

    let totalLessons = 0;
    let totalGames = 0;

    for (const topic of topics) {
      // Count lessons
      const [lessons]: any = await connection.execute(
        "SELECT * FROM lessons WHERE topic_id = ?",
        [topic.id],
      );
      totalLessons += lessons.length;

      // Count games
      for (const lesson of lessons) {
        const [games]: any = await connection.execute(
          "SELECT COUNT(*) as count FROM games WHERE lesson_id = ?",
          [lesson.id],
        );
        totalGames += games[0].count;
      }

      console.log(
        `   - ${topic.title} (${lessons.length} lessons, games in those lessons)`,
      );
    }

    console.log(
      `\n📊 Total: ${topics.length} topics, ${totalLessons} lessons, ${totalGames} games`,
    );

    // Delete all games
    if (totalGames > 0) {
      console.log(`\n🗄️  Deleting all games (${totalGames} total)...`);
      for (const topic of topics) {
        const [lessons]: any = await connection.execute(
          "SELECT id FROM lessons WHERE topic_id = ?",
          [topic.id],
        );
        for (const lesson of lessons) {
          await connection.execute("DELETE FROM games WHERE lesson_id = ?", [
            lesson.id,
          ]);
        }
      }
      console.log(`   ✅ Deleted ${totalGames} game(s)`);
    }

    // Delete all lessons
    if (totalLessons > 0) {
      console.log(`\n🗄️  Deleting all lessons (${totalLessons} total)...`);
      for (const topic of topics) {
        await connection.execute("DELETE FROM lessons WHERE topic_id = ?", [
          topic.id,
        ]);
      }
      console.log(`   ✅ Deleted ${totalLessons} lesson(s)`);
    }

    // Delete all topics
    console.log(`\n🗄️  Deleting all topics (${topics.length} total)...`);
    await connection.execute("DELETE FROM topics WHERE course_id = ?", [
      course.id,
    ]);
    console.log(`   ✅ Deleted ${topics.length} topic(s)`);
  } else {
    console.log("\n   No topics found in this course");
  }

  // 3. Delete course from database
  console.log("\n🗄️  Deleting course from database...");
  await connection.execute("DELETE FROM courses WHERE slug = ?", [COURSE_SLUG]);
  console.log("   ✅ Deleted from database");

  console.log("\n✅ Course removed successfully!");
  console.log("\n⚠️  Remember to:");
  console.log(
    "   1. Manually delete entire course folder: src/content/[course]/",
  );
  console.log("   2. Manually delete all assets: public/t10-cd-*");
  console.log("   3. Clean up PlayGameContent.tsx");
  console.log("   4. rm -rf .next");
  console.log("   5. Restart dev server");

  await connection.end();
}

removeCourse().catch(console.error);
