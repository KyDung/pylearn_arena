import { pool } from "./src/lib/db";

async function checkGames() {
  try {
    // Check all games in database
    const [allGames] = await pool.execute(
      "SELECT id, lesson_id, title, slug, path FROM games ORDER BY id DESC LIMIT 10",
    );

    console.log("Last 10 games in database:");
    console.log(JSON.stringify(allGames, null, 2));

    await pool.end();
  } catch (error) {
    console.error("Error:", error);
    await pool.end();
  }
}

checkGames();
