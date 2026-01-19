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

async function addTopic() {
  console.log("\n📚 ADD NEW TOPIC (CHỦ ĐỀ)\n");
  console.log("=".repeat(50));

  try {
    const courseId = await question("Course ID (vd: python-basics): ");
    const title = await question("Tên chủ đề: ");
    const description = await question("Mô tả: ");
    const order = await question("Thứ tự (vd: 1, 2, 3...): ");

    console.log("\n✅ Đang thêm vào database...\n");

    // Get course ID by slug
    const [courseRows] = (await pool.query(
      "SELECT id FROM courses WHERE slug = ?",
      [courseId],
    )) as any;

    if (!courseRows || courseRows.length === 0) {
      console.log("❌ Course không tồn tại!");
      await pool.end();
      rl.close();
      return;
    }

    const dbCourseId = courseRows[0].id;
    const slug = title.toLowerCase().replace(/\s+/g, "-");

    const [result] = (await pool.query(
      `INSERT INTO topics (course_id, slug, title, description, order_num)
       VALUES (?, ?, ?, ?, ?)`,
      [dbCourseId, slug, title, description, parseInt(order)],
    )) as any;

    const topicId = result.insertId;

    console.log(`✅ Topic đã được thêm!`);
    console.log(`\n📝 Thông tin:`);
    console.log(`   - ID: ${topicId}`);
    console.log(`   - Tên: ${title}`);
    console.log(`   - Course: ${courseId}`);
    console.log(`   - Thứ tự: ${order}`);
    console.log(`\n💡 Topic ID: ${topicId} (dùng khi thêm lesson)`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    rl.close();
  }
}

addTopic();
