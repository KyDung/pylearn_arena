import db from "../src/lib/db";

async function checkGameSlugs() {
  try {
    console.log("Checking games in database...\n");

    const [games] = await db.query(
      "SELECT id, lesson_id, slug, title, path FROM games LIMIT 5",
    );

    console.log("Sample games:");
    console.log(JSON.stringify(games, null, 2));

    const [slugCount] = await db.query(
      "SELECT COUNT(*) as total, SUM(slug IS NOT NULL) as with_slug FROM games",
    );

    console.log("\nSlug statistics:");
    console.log(JSON.stringify(slugCount, null, 2));

    await db.end();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkGameSlugs();
