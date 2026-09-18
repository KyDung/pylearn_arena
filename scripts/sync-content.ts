#!/usr/bin/env node
/**
 * 🔄 SYNC CONTENT SCRIPT
 *
 * Đồng bộ content từ DB:
 * - Tạo file content còn thiếu
 * - Tạo folder assets còn thiếu
 * - Cập nhật PlayGameContent.tsx
 *
 * Chạy: npx tsx scripts/sync-content.ts
 */

import * as fs from "fs";
import * as path from "path";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg: string) =>
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
};

async function syncContent() {
  console.log("\n🔄 SYNC CONTENT - Đồng bộ từ DB\n");
  console.log("=".repeat(60));

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "1900100co",
    database: process.env.MYSQL_DATABASE || "pylearn_arena",
  });

  const contentDir = path.join(process.cwd(), "src/content");
  const publicDir = path.join(process.cwd(), "public");
  const templateDir = path.join(contentDir, "_template");

  let createdFiles = 0;
  let createdFolders = 0;
  let skipped = 0;

  try {
    // Lấy tất cả games
    const [games] = await conn.query<RowDataPacket[]>(
      `SELECT g.*, 
              l.slug as lesson_slug,
              t.slug as topic_slug,
              c.slug as course_slug
       FROM games g
       INNER JOIN lessons l ON g.lesson_id = l.id
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       ORDER BY g.id`,
    );

    console.log(`\n📊 Tìm thấy ${games.length} games trong DB\n`);

    for (const game of games) {
      const gamePath = game.path;
      const contentPath = path.join(contentDir, gamePath);
      const indexPath = path.join(contentPath, "index.ts");
      const assetPath = path.join(publicDir, gamePath);

      // 1. Tạo content folder nếu chưa có
      if (!fs.existsSync(contentPath)) {
        fs.mkdirSync(contentPath, { recursive: true });
        log.info(`Created folder: src/content/${gamePath}/`);
        createdFolders++;
      }

      // 2. Tạo index.ts nếu chưa có
      if (!fs.existsSync(indexPath)) {
        // Copy từ template type2 (phổ biến hơn)
        const templatePath = path.join(templateDir, "game-template-type2.ts");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");

          // Thay thế title
          template = template.replace(
            'title: "Tiêu đề game của bạn"',
            `title: "${game.title}"`,
          );

          // Thay thế path trong assets
          template = template.replace(
            /background: "\/game-id\//g,
            `background: "/${gamePath}/`,
          );

          fs.writeFileSync(indexPath, template);
          log.success(`Created: src/content/${gamePath}/index.ts`);
          createdFiles++;
        } else {
          log.error(`Template not found: ${templatePath}`);
        }
      } else {
        skipped++;
      }

      // 3. Tạo asset folder nếu chưa có
      if (!fs.existsSync(assetPath)) {
        fs.mkdirSync(assetPath, { recursive: true });

        // Tạo README hướng dẫn
        const readmePath = path.join(assetPath, "README.txt");
        fs.writeFileSync(
          readmePath,
          `Assets for game: ${game.title}\n\nAdd background images here:\n- scene1.png (720x520px)\n- scene2.png\n- scene3.png\n`,
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Kết quả:");
    console.log(`   ✅ Created files:   ${createdFiles}`);
    console.log(`   📁 Created folders: ${createdFolders}`);
    console.log(`   ⏭️  Skipped:         ${skipped}`);
    console.log("");

    if (createdFiles > 0) {
      log.warn("Nhớ cập nhật GAME_CONFIG trong các file mới tạo!");
      log.warn("Chạy: npx tsx scripts/validate-content.ts để kiểm tra");
    } else {
      log.success("Không có file mới cần tạo");
    }
  } finally {
    await conn.end();
  }
}

syncContent().catch(console.error);
