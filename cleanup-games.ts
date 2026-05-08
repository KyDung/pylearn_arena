import { pool } from "./src/lib/db";
import fs from "fs/promises";
import path from "path";

async function cleanupGames() {
  try {
    // Get all games to delete their files
    const [games]: any = await pool.execute(
      "SELECT id, path FROM games WHERE id IN (6, 7, 8)",
    );

    console.log("Games to delete:");
    console.log(JSON.stringify(games, null, 2));

    const projectRoot = process.cwd();

    // Delete files for each game
    for (const game of games) {
      if (game.path) {
        const publicPath = path.join(projectRoot, "public", game.path);
        const contentPath = path.join(projectRoot, "src", "content", game.path);

        try {
          await fs.rm(publicPath, { recursive: true, force: true });
          console.log(`✅ Deleted: ${publicPath}`);
        } catch (err: any) {
          console.log(`⚠️ Could not delete: ${publicPath} - ${err.message}`);
        }

        try {
          await fs.rm(contentPath, { recursive: true, force: true });
          console.log(`✅ Deleted: ${contentPath}`);
        } catch (err: any) {
          console.log(`⚠️ Could not delete: ${contentPath} - ${err.message}`);
        }
      }
    }

    // Delete from database
    await pool.execute("DELETE FROM games WHERE id IN (6, 7, 8)");
    console.log("\n✅ Deleted games from database");

    // Show remaining games
    const [remaining]: any = await pool.execute(
      "SELECT id, title, slug, path FROM games ORDER BY id",
    );

    console.log("\nRemaining games:");
    console.log(JSON.stringify(remaining, null, 2));

    await pool.end();
  } catch (error) {
    console.error("Error:", error);
    await pool.end();
  }
}

cleanupGames();
