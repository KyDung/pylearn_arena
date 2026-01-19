import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const GAME_SLUG = process.argv[2];

if (!GAME_SLUG) {
  console.error("❌ Usage: npx tsx scripts/remove-game.ts <game-slug>");
  console.error("   Example: npx tsx scripts/remove-game.ts t10-cd-b12-id3");
  process.exit(1);
}

async function removeGame() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log(`\n🗑️  Removing game: ${GAME_SLUG}\n`);

  // 1. Get game info
  const [games]: any = await connection.execute(
    "SELECT * FROM games WHERE slug = ?",
    [GAME_SLUG],
  );

  if (games.length === 0) {
    console.log("❌ Game not found in database");
    await connection.end();
    return;
  }

  const game = games[0];
  console.log(`📋 Found: ${game.title}`);
  console.log(`   Path: ${game.path}\n`);

  // 2. Delete from database
  console.log("🗄️  Deleting from database...");
  await connection.execute("DELETE FROM games WHERE slug = ?", [GAME_SLUG]);
  console.log("   ✅ Deleted from database");

  // 3. Delete code folder
  const codePath = path.join(
    process.cwd(),
    "src",
    "content",
    ...game.path.split("/"),
  );
  if (fs.existsSync(codePath)) {
    fs.rmSync(codePath, { recursive: true, force: true });
    console.log(`   ✅ Deleted: ${codePath}`);
  }

  // 4. Delete assets folder (hierarchical structure)
  const assetsPath = path.join(
    process.cwd(),
    "public",
    ...game.path.split("/"),
  );
  if (fs.existsSync(assetsPath)) {
    fs.rmSync(assetsPath, { recursive: true, force: true });
    console.log(`   ✅ Deleted: ${assetsPath}`);
  }

  console.log("\n✅ Game removed successfully!");
  console.log("\n⚠️  Remember to:");
  console.log("   1. Remove import in PlayGameContent.tsx");
  console.log("   2. rm -rf .next");
  console.log("   3. Restart dev server");

  await connection.end();
}

removeGame().catch(console.error);
