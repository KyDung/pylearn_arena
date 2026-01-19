#!/usr/bin/env node
/**
 * 🎮 ALL-IN-ONE SCRIPT - Thêm game hoàn chỉnh
 *
 * Chỉ cần chạy 1 lệnh: npx tsx scripts/add-complete-game.ts
 *
 * Script sẽ TỰ ĐỘNG:
 * 1. Tạo folder code game
 * 2. Copy template vào folder
 * 3. Tạo folder assets
 * 4. Thêm vào database
 * 5. Update PlayGameContent.tsx (thêm import + mapping)
 * 6. Update courses.json
 *
 * Sau khi chạy, bạn chỉ cần:
 * - Sửa GAME_CONFIG trong file index.ts (title, testCases, starterCode)
 * - Thêm background images vào folder assets (nếu cần)
 * - Sửa code Phaser (nếu muốn game phức tạp)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import mysql from "mysql2/promise";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  console.log("\n🎮 ADD COMPLETE GAME - ALL IN ONE\n");
  console.log("=".repeat(50));

  // Connect to database
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1900100co",
    database: "pylearn_arena",
  });

  try {
    // Show existing structure
    console.log("\n📚 Cấu trúc hiện có:\n");

    const [courses]: any = await conn.query(
      `SELECT c.id, c.slug, c.title FROM courses c ORDER BY c.id`,
    );

    for (const course of courses) {
      console.log(`📘 [${course.id}] ${course.title} (${course.slug})`);

      const [topics]: any = await conn.query(
        `SELECT t.id, t.slug, t.title FROM topics t WHERE t.course_id = ? ORDER BY t.order_num`,
        [course.id],
      );

      for (const topic of topics) {
        console.log(`   📂 [${topic.id}] ${topic.title} (${topic.slug})`);

        const [lessons]: any = await conn.query(
          `SELECT l.id, l.slug, l.title FROM lessons l WHERE l.topic_id = ? ORDER BY l.order_num`,
          [topic.id],
        );

        for (const lesson of lessons) {
          const [games]: any = await conn.query(
            `SELECT COUNT(*) as count FROM games WHERE lesson_id = ?`,
            [lesson.id],
          );
          console.log(
            `      📝 [${lesson.id}] ${lesson.title} (${lesson.slug}) - ${games[0].count} games`,
          );
        }
      }
    }

    // Get input
    console.log("\n" + "=".repeat(50));
    console.log("\n📝 Nhập thông tin game mới:\n");

    const lessonId = await question("Lesson ID (số): ");

    // Get lesson info for path building
    const [lessonInfo]: any = await conn.query(
      `SELECT l.slug as lesson_slug, t.slug as topic_slug, c.slug as course_slug 
       FROM lessons l 
       JOIN topics t ON l.topic_id = t.id 
       JOIN courses c ON t.course_id = c.id 
       WHERE l.id = ?`,
      [parseInt(lessonId)],
    );

    if (lessonInfo.length === 0) {
      console.log("❌ Lesson không tồn tại!");
      return;
    }

    const courseSlug = lessonInfo[0].course_slug;
    const topicSlug = lessonInfo[0].topic_slug;
    const lessonSlug = lessonInfo[0].lesson_slug;

    // Count existing games to suggest next ID
    const [existingGames]: any = await conn.query(
      `SELECT COUNT(*) as count FROM games WHERE lesson_id = ?`,
      [parseInt(lessonId)],
    );
    const suggestedId = `id${existingGames[0].count + 1}`;

    const gameId =
      (await question(`Game ID (vd: ${suggestedId}): `)) || suggestedId;
    const gameSlug = `${lessonSlug}-${gameId}`;
    const title = await question("Tiêu đề game: ");
    const description = await question("Mô tả ngắn: ");

    console.log("\n📋 Chọn loại template:");
    console.log("  1. Type 1: Function Testing (gọi hàm nhiều lần)");
    console.log("  2. Type 2: CodeRunner Style (input/output với print)");
    const templateType = (await question("Chọn (1/2): ")) || "2";

    // Build paths
    const gamePath = `${courseSlug}/${topicSlug}/${lessonSlug}/${gameId}`;
    const contentDir = path.join(process.cwd(), "src/content", gamePath);
    const publicDir = path.join(process.cwd(), "public", gamePath);
    const indexPath = path.join(contentDir, "index.ts");

    console.log("\n" + "=".repeat(50));
    console.log("\n🚀 Đang tạo game...\n");

    // 1. Create directories
    fs.mkdirSync(contentDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`✅ Tạo folder: src/content/${gamePath}/`);
    console.log(`✅ Tạo folder: public/${gamePath}/`);

    // 2. Copy template
    const templateFile =
      templateType === "1"
        ? "game-template-type1.ts"
        : "game-template-type2.ts";
    const templatePath = path.join(
      process.cwd(),
      "src/content/_template",
      templateFile,
    );
    let template = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    template = template.replace(
      'title: "Tiêu đề game của bạn"',
      `title: "${title}"`,
    );
    template = template.replace(
      /background: "\/game-id\//g,
      `background: "/${gamePath}/`,
    );

    fs.writeFileSync(indexPath, template);
    console.log(`✅ Tạo file: src/content/${gamePath}/index.ts`);

    // 3. Create placeholder assets
    const placeholderPath = path.join(publicDir, "README.txt");
    fs.writeFileSync(
      placeholderPath,
      `Thêm background images vào đây:\n- scene1.png (720x520px)\n- scene2.png\n- scene3.png\n`,
    );
    console.log(`✅ Tạo folder assets: public/${gamePath}/`);

    // 4. Add to database
    const orderNum = existingGames[0].count + 1;
    await conn.execute(
      `INSERT INTO games (lesson_id, slug, title, description, order_num, path) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), path=VALUES(path)`,
      [parseInt(lessonId), gameSlug, title, description, orderNum, gamePath],
    );
    console.log(`✅ Thêm vào database: ${gameSlug}`);

    // 5. Update PlayGameContent.tsx
    const playGamePath = path.join(
      process.cwd(),
      "src/components/PlayGameContent.tsx",
    );
    let playGameContent = fs.readFileSync(playGamePath, "utf-8");

    // Find last import
    const importRegex = /import initGame\d+ from "@\/content\/.*\/index";/g;
    const imports = playGameContent.match(importRegex) || [];
    const lastImport = imports[imports.length - 1];

    // Determine next game number
    const gameNumbers = imports.map((i) => {
      const match = i.match(/initGame(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextGameNum = Math.max(...gameNumbers, 0) + 1;
    const newImport = `import initGame${nextGameNum} from "@/content/${gamePath}/index";`;

    // Add import
    if (lastImport && !playGameContent.includes(newImport)) {
      playGameContent = playGameContent.replace(
        lastImport,
        `${lastImport}\n${newImport}`,
      );
    }

    // Add to gameModules
    const modulesRegex = /("[\w\-\/]+": initGame\d+,?\n)(\};)/;
    const newMapping = `  "${gamePath}": initGame${nextGameNum},\n};`;
    playGameContent = playGameContent.replace(modulesRegex, `$1${newMapping}`);

    fs.writeFileSync(playGamePath, playGameContent);
    console.log(`✅ Update PlayGameContent.tsx`);

    // 6. Update courses.json
    const coursesJsonPath = path.join(process.cwd(), "src/data/courses.json");
    const coursesData = JSON.parse(fs.readFileSync(coursesJsonPath, "utf-8"));

    // Find and update the correct location
    for (const course of coursesData) {
      if (course.id === courseSlug) {
        for (const chapter of course.chapters) {
          for (const lesson of chapter.lessons) {
            if (lesson.id === lessonSlug) {
              lesson.games.push({
                id: gameSlug,
                title: `Game ${String(orderNum).padStart(2, "0")}: ${title}`,
                summary: description,
                path: gamePath,
              });
            }
          }
        }
      }
    }

    fs.writeFileSync(coursesJsonPath, JSON.stringify(coursesData, null, 2));
    console.log(`✅ Update courses.json`);

    // Done!
    console.log("\n" + "=".repeat(50));
    console.log("\n🎉 HOÀN THÀNH!\n");
    console.log(`📁 File game: src/content/${gamePath}/index.ts`);
    console.log(`🖼️ Assets: public/${gamePath}/`);
    console.log(`🔗 Path: ${gamePath}`);
    console.log("\n📝 Việc cần làm tiếp:");
    console.log(
      "   1. Sửa GAME_CONFIG trong index.ts (title, testCases, starterCode)",
    );
    console.log("   2. Thêm background images vào folder assets");
    console.log("   3. (Tùy chọn) Sửa code Phaser nếu muốn game phức tạp");
    console.log("   4. rm -rf .next && pnpm dev");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await conn.end();
    rl.close();
  }
}

main();
