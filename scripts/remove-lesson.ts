import mysql from "mysql2/promise";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

const LESSON_SLUG = process.argv[2];

if (!LESSON_SLUG) {
  console.error("❌ Usage: npx tsx scripts/remove-lesson.ts <lesson-slug>");
  console.error("   Example: npx tsx scripts/remove-lesson.ts t10-cd-b12");
  process.exit(1);
}

async function removeLesson() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log(`\n🗑️  Removing lesson: ${LESSON_SLUG}\n`);

  // 1. Get lesson info
  const [lessons] = await connection.execute<RowDataPacket[]>(
    "SELECT * FROM lessons WHERE slug = ?",
    [LESSON_SLUG],
  );

  if (lessons.length === 0) {
    console.log("❌ Lesson not found in database");
    await connection.end();
    return;
  }

  const lesson = lessons[0];
  console.log(`📋 Found: ${lesson.title}`);

  // 2. Get all games in this lesson
  const [games] = await connection.execute<RowDataPacket[]>(
    "SELECT * FROM games WHERE lesson_id = ?",
    [lesson.id],
  );

  if (games.length > 0) {
    console.log(`\n⚠️  This lesson contains ${games.length} game(s):`);
    games.forEach((g) => {
      console.log(`   - ${g.title} (${g.slug})`);
    });

    console.log(`\n🗄️  Deleting all games from database...`);
    await connection.execute("DELETE FROM games WHERE lesson_id = ?", [
      lesson.id,
    ]);
    console.log(`   ✅ Deleted ${games.length} game(s)`);
  } else {
    console.log("\n   No games found in this lesson");
  }

  // 3. Delete lesson from database
  console.log("\n🗄️  Deleting lesson from database...");
  await connection.execute("DELETE FROM lessons WHERE slug = ?", [LESSON_SLUG]);
  console.log("   ✅ Deleted from database");

  console.log("\n✅ Lesson removed successfully!");
  console.log("\n⚠️  Remember to:");
  console.log("   1. Manually delete game code folders in src/content/");
  console.log("   2. Manually delete game assets in public/");
  console.log("   3. Remove imports in PlayGameContent.tsx");
  console.log("   4. rm -rf .next");
  console.log("   5. Restart dev server");

  await connection.end();
}

removeLesson().catch(console.error);
