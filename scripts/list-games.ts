#!/usr/bin/env node
/**
 * 📋 LIST GAMES SCRIPT
 * 
 * Hiển thị cấu trúc games từ DB và kiểm tra trạng thái files
 * 
 * Chạy: npx tsx scripts/list-games.ts
 */

import * as fs from "fs";
import * as path from "path";
import mysql from "mysql2/promise";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

async function listGames() {
  console.log("\n📋 DANH SÁCH GAMES\n");
  console.log("=".repeat(80));

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "1900100co",
    database: process.env.MYSQL_DATABASE || "pylearn_arena",
  });

  try {
    const [courses]: any = await conn.query(
      "SELECT * FROM courses ORDER BY id"
    );

    const contentDir = path.join(process.cwd(), "src/content");

    for (const course of courses) {
      console.log(`\n${colors.cyan}📘 ${course.title}${colors.reset} (${course.slug})`);

      const [topics]: any = await conn.query(
        "SELECT * FROM topics WHERE course_id = ? ORDER BY order_num",
        [course.id]
      );

      for (const topic of topics) {
        console.log(`   ${colors.blue}📂 ${topic.title}${colors.reset} (${topic.slug})`);

        const [lessons]: any = await conn.query(
          "SELECT * FROM lessons WHERE topic_id = ? ORDER BY order_num",
          [topic.id]
        );

        for (const lesson of lessons) {
          const [games]: any = await conn.query(
            "SELECT * FROM games WHERE lesson_id = ? ORDER BY order_num",
            [lesson.id]
          );

          console.log(`      ${colors.yellow}📝 ${lesson.title}${colors.reset} (${lesson.slug}) - ${games.length} games`);

          for (const game of games) {
            const contentPath = path.join(contentDir, game.path, "index.ts");
            const hasFile = fs.existsSync(contentPath);
            
            const status = hasFile 
              ? `${colors.green}✓${colors.reset}` 
              : `${colors.red}✗${colors.reset}`;
            
            console.log(`         ${status} ${game.title} ${colors.dim}(${game.path})${colors.reset}`);
          }
        }
      }
    }

    // Summary
    const [totalGames]: any = await conn.query("SELECT COUNT(*) as count FROM games");
    const [totalLessons]: any = await conn.query("SELECT COUNT(*) as count FROM lessons");
    const [totalTopics]: any = await conn.query("SELECT COUNT(*) as count FROM topics");

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 Tổng kết:`);
    console.log(`   📘 Courses: ${courses.length}`);
    console.log(`   📂 Topics:  ${totalTopics[0].count}`);
    console.log(`   📝 Lessons: ${totalLessons[0].count}`);
    console.log(`   🎮 Games:   ${totalGames[0].count}\n`);

  } finally {
    await conn.end();
  }
}

listGames().catch(console.error);
