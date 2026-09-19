#!/usr/bin/env node
import * as readline from "readline";
import pool from "../src/lib/db";
import type { RowDataPacket } from "@/lib/dbTypes";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function addLesson() {
  console.log("\n📝 ADD NEW LESSON (BÀI HỌC)\n");
  console.log("=".repeat(50));

  try {
    // Show available topics
    const [topics] = await pool.query<RowDataPacket[]>(
      "SELECT t.id, t.title, c.slug as course_slug FROM topics t INNER JOIN courses c ON t.course_id = c.id ORDER BY t.order_num",
    );

    if (Array.isArray(topics) && topics.length > 0) {
      console.log("\n📚 Topics hiện có:");
      topics.forEach((t) => {
        console.log(`   [${t.id}] ${t.title} (${t.course_slug})`);
      });
      console.log("");
    }

    const topicId = await question("Topic ID (chọn từ danh sách trên): ");
    const lessonId = await question("Lesson ID (vd: bai-13): ");
    const title = await question("Tên bài học: ");
    const description = await question("Mô tả: ");
    const order = await question("Thứ tự trong topic (vd: 1, 2...): ");

    console.log("\n✅ Đang thêm vào database...\n");

    await pool.query(
      `INSERT INTO lessons (topic_id, slug, title, description, summary, order_num)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         summary = VALUES(summary),
         order_num = VALUES(order_num),
         updated_at = CURRENT_TIMESTAMP`,
      [
        parseInt(topicId),
        lessonId,
        title,
        description,
        description, // summary
        parseInt(order),
      ],
    );

    console.log(`✅ Lesson đã được thêm!`);
    console.log(`\n📝 Thông tin:`);
    console.log(`   - Slug: ${lessonId}`);
    console.log(`   - Tên: ${title}`);
    console.log(`   - Topic ID: ${topicId}`);
    console.log(`   - Thứ tự: ${order}`);
    console.log(`\n💡 Dùng slug '${lessonId}' khi thêm game`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    rl.close();
  }
}

addLesson();
