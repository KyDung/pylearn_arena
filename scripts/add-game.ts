#!/usr/bin/env node
import * as readline from "readline";
import pool from "../src/lib/db";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function addGame() {
  console.log("\n🎮 ADD NEW GAME\n");
  console.log("=".repeat(50));

  try {
    // Show available lessons
    const [lessons] = (await pool.query(
      `SELECT l.id, l.slug, l.title, t.title as topic_title
       FROM lessons l
       JOIN topics t ON l.topic_id = t.id
       ORDER BY l.order_num`,
    )) as any;

    if (Array.isArray(lessons) && lessons.length > 0) {
      console.log("\n📝 Lessons hiện có:");
      lessons.forEach((l: any) => {
        console.log(`   [${l.id}] ${l.title} (Topic: ${l.topic_title})`);
      });
      console.log("");
    }

    const lessonId = await question("Lesson ID (số): ");
    const gameSlug = await question("Game Slug (vd: t10-cd-b12-id5): ");
    const title = await question("Tên game: ");
    const description = await question("Mô tả: ");
    const order = await question("Thứ tự (vd: 1, 2, 3...): ");
    const path = await question(
      "Path (vd: python-basics/chapter-1/t10-cd-b12/id5): ",
    );

    console.log("\n✅ Đang thêm vào database...\n");

    await pool.query(
      `INSERT INTO games (lesson_id, slug, title, description, order_num, path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         description = VALUES(description),
         order_num = VALUES(order_num),
         path = VALUES(path),
         updated_at = CURRENT_TIMESTAMP`,
      [parseInt(lessonId), gameSlug, title, description, parseInt(order), path],
    );

    console.log(`✅ Game đã được thêm vào database!`);
    console.log(`\n📝 Thông tin:`);
    console.log(`   - Slug: ${gameSlug}`);
    console.log(`   - Tên: ${title}`);
    console.log(`   - Lesson ID: ${lessonId}`);
    console.log(`   - Path: ${path}`);
    console.log(
      `\n⚠️  Nhớ tạo file game code tại: src/content/${path}/index.ts`,
    );
    console.log(`   Dùng lệnh: npx tsx scripts/generate-game.ts`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    rl.close();
  }
}

addGame();
