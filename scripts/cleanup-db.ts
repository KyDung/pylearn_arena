import mysql from "mysql2/promise";
import type { ResultSetHeader } from "mysql2/promise";

async function cleanup() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  console.log("📊 Kiểm tra lessons và games hiện tại...\n");

  const [lessons] = await connection.execute(`
    SELECT l.id, l.slug, l.title, 
           COUNT(g.id) as game_count,
           GROUP_CONCAT(g.slug) as game_slugs
    FROM lessons l 
    LEFT JOIN games g ON l.id = g.lesson_id
    GROUP BY l.id
  `);

  console.table(lessons);

  // Xóa lessons không còn game nào
  console.log("\n🗑️  Xóa lessons không còn game...");

  const [result] = await connection.execute<ResultSetHeader>(`
    DELETE l FROM lessons l
    LEFT JOIN games g ON l.id = g.lesson_id
    WHERE g.id IS NULL
  `);

  console.log(`✅ Đã xóa ${result.affectedRows} lessons`);

  // Kiểm tra topics còn lesson nào không
  const [topics] = await connection.execute(`
    SELECT t.id, t.slug, t.title,
           COUNT(l.id) as lesson_count
    FROM topics t
    LEFT JOIN lessons l ON t.id = l.topic_id
    GROUP BY t.id
  `);

  console.log("\n📚 Topics:");
  console.table(topics);

  await connection.end();
}

cleanup().catch(console.error);
