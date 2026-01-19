import mysql from "mysql2/promise";

async function updateGamePaths() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log("\n🔄 Updating game paths to new structure...\n");

  try {
    // Update game 1
    await connection.execute("UPDATE games SET path = ? WHERE slug = ?", [
      "python-basics/chapter-1/t10-cd-b12/id1",
      "t10-cd-b12-id1",
    ]);
    console.log("✅ Updated game 1 path");

    // Update game 2
    await connection.execute("UPDATE games SET path = ? WHERE slug = ?", [
      "python-basics/chapter-1/t10-cd-b12/id2",
      "t10-cd-b12-id2",
    ]);
    console.log("✅ Updated game 2 path");

    // Verify
    const [games] = await connection.execute(
      "SELECT slug, path FROM games ORDER BY order_num",
    );
    console.log("\n📋 Current game paths:");
    console.table(games);

    console.log("\n✅ Database paths updated successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await connection.end();
  }
}

updateGamePaths().catch(console.error);
