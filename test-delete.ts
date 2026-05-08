import { pool } from "./src/lib/db";
import fs from "fs/promises";
import path from "path";

async function testDeleteGame() {
  try {
    const gameId = 9;

    // Get game info first
    const [games]: any = await pool.execute(
      "SELECT id, path FROM games WHERE id = ?",
      [gameId],
    );

    console.log("Game to delete:", games[0]);

    if (games.length === 0) {
      console.log("Game not found!");
      await pool.end();
      return;
    }

    const game = games[0];

    // Simulate what the API does
    console.log("\n--- Simulating delete cascade ---");

    // Step 1: Delete from user_progress (correct table name)
    const [r1] = await pool.execute(
      "DELETE FROM user_progress WHERE game_id = ?",
      [gameId],
    );
    console.log("Deleted from user_progress:", r1);

    // Step 2: Delete from course_content_access
    const [r2] = await pool.execute(
      "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
      ["game", gameId],
    );
    console.log("Deleted from course_content_access:", r2);

    // Step 3: Delete from games table
    const [r3] = await pool.execute("DELETE FROM games WHERE id = ?", [gameId]);
    console.log("Deleted from games:", r3);

    // Step 4: Delete files
    if (game.path) {
      const projectRoot = process.cwd();
      const publicPath = path.join(projectRoot, "public", game.path);
      const contentPath = path.join(projectRoot, "src", "content", game.path);

      try {
        await fs.rm(publicPath, { recursive: true, force: true });
        console.log("✅ Deleted public folder:", publicPath);
      } catch (err: any) {
        console.log("⚠️ Public folder:", err.message);
      }

      try {
        await fs.rm(contentPath, { recursive: true, force: true });
        console.log("✅ Deleted content folder:", contentPath);
      } catch (err: any) {
        console.log("⚠️ Content folder:", err.message);
      }
    }

    // Verify
    const [remaining]: any = await pool.execute("SELECT id, title FROM games");
    console.log("\nRemaining games:", remaining);

    await pool.end();
  } catch (error) {
    console.error("Error:", error);
    await pool.end();
  }
}

testDeleteGame();
