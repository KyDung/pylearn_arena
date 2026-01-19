import mysql from "mysql2/promise";

const TOPIC_SLUG = process.argv[2];

if (!TOPIC_SLUG) {
  console.error("❌ Usage: npx tsx scripts/remove-topic.ts <topic-slug>");
  console.error("   Example: npx tsx scripts/remove-topic.ts chapter-1");
  process.exit(1);
}

async function removeTopic() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log(`\n🗑️  Removing topic: ${TOPIC_SLUG}\n`);

  // 1. Get topic info
  const [topics]: any = await connection.execute(
    "SELECT * FROM topics WHERE slug = ?",
    [TOPIC_SLUG],
  );

  if (topics.length === 0) {
    console.log("❌ Topic not found in database");
    await connection.end();
    return;
  }

  const topic = topics[0];
  console.log(`📋 Found: ${topic.title}`);

  // 2. Get all lessons in this topic
  const [lessons]: any = await connection.execute(
    "SELECT * FROM lessons WHERE topic_id = ?",
    [topic.id],
  );

  if (lessons.length > 0) {
    console.log(`\n⚠️  This topic contains ${lessons.length} lesson(s):`);

    let totalGames = 0;
    for (const lesson of lessons) {
      const [games]: any = await connection.execute(
        "SELECT COUNT(*) as count FROM games WHERE lesson_id = ?",
        [lesson.id],
      );
      const gameCount = games[0].count;
      totalGames += gameCount;
      console.log(`   - ${lesson.title} (${gameCount} games)`);
    }

    console.log(`\n🗄️  Deleting all games (${totalGames} total)...`);
    for (const lesson of lessons) {
      await connection.execute("DELETE FROM games WHERE lesson_id = ?", [
        lesson.id,
      ]);
    }
    console.log(`   ✅ Deleted ${totalGames} game(s)`);

    console.log(`\n🗄️  Deleting all lessons (${lessons.length} total)...`);
    await connection.execute("DELETE FROM lessons WHERE topic_id = ?", [
      topic.id,
    ]);
    console.log(`   ✅ Deleted ${lessons.length} lesson(s)`);
  } else {
    console.log("\n   No lessons found in this topic");
  }

  // 3. Delete topic from database
  console.log("\n🗄️  Deleting topic from database...");
  await connection.execute("DELETE FROM topics WHERE slug = ?", [TOPIC_SLUG]);
  console.log("   ✅ Deleted from database");

  console.log("\n✅ Topic removed successfully!");
  console.log("\n⚠️  Remember to:");
  console.log("   1. Manually delete all game code folders in src/content/");
  console.log("   2. Manually delete all game assets in public/");
  console.log("   3. Remove imports in PlayGameContent.tsx");
  console.log("   4. rm -rf .next");
  console.log("   5. Restart dev server");

  await connection.end();
}

removeTopic().catch(console.error);
