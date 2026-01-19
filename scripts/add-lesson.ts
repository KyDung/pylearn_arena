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

async function addLesson() {
  console.log("\n📚 ADD NEW LESSON TO DATABASE\n");
  console.log("=".repeat(50));

  try {
    // Thu thập thông tin
    const courseId = await question("Course ID (vd: python-basics): ");
    const lessonId = await question("Lesson ID (vd: t10-cd-b12-id5): ");
    const title = await question("Tiêu đề bài học: ");
    const description = await question("Mô tả ngắn: ");
    const order = await question("Thứ tự (vd: 5): ");
    const duration = await question("Thời lượng phút (vd: 15): ");
    const gameType = await question("Loại game (string/list/dict/loop): ");

    console.log("\n✅ Đang thêm vào database...\n");

    // Kiểm tra course tồn tại
    const [courseCheck] = (await pool.query(
      "SELECT id FROM courses WHERE slug = ?",
      [courseId],
    )) as any;

    if (!Array.isArray(courseCheck) || courseCheck.length === 0) {
      console.log(`⚠️  Course '${courseId}' chưa tồn tại. Tạo mới...`);
      const courseName = await question("Tên khóa học: ");
      const courseDesc = await question("Mô tả khóa học: ");

      await pool.query(
        `INSERT INTO courses (slug, title, description, difficulty, is_published)
         VALUES (?, ?, ?, 'beginner', 1)`,
        [courseId, courseName, courseDesc],
      );
      console.log(`✅ Course '${courseId}' đã được tạo`);
    }

    // Note: Cần topic_id, script này cần update để hỏi topic_id
    console.log("⚠️  Script này cũ, dùng add-lesson-new.ts thay thế!");

    console.log(
      `✅ Lesson '${lessonId}' đã được thêm vào course '${courseId}'`,
    );
    console.log(`\n📝 Thông tin:`);
    console.log(`   - Title: ${title}`);
    console.log(`   - Order: ${order}`);
    console.log(`   - Duration: ${duration} minutes`);
    console.log(`   - Game type: ${gameType}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
    rl.close();
  }
}

addLesson();
