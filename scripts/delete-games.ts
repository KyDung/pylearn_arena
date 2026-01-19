import mysql from "mysql2/promise";

async function deleteGames() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log("🗑️  Xóa game 3 và 4...");

  await connection.execute("DELETE FROM games WHERE slug IN (?, ?)", [
    "t10-cd-b12-id3",
    "t10-cd-b12-id4",
  ]);

  console.log("✅ Đã xóa!");

  const [games] = await connection.execute("SELECT id, slug, title FROM games");
  console.log("\n📋 Games còn lại:");
  console.table(games);

  await connection.end();
}

deleteGames().catch(console.error);
