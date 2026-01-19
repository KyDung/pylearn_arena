#!/usr/bin/env node
/**
 * 🔍 VALIDATE CONTENT SCRIPT
 *
 * Kiểm tra đồng bộ giữa:
 * - Database (games table)
 * - Source code (src/content/...)
 * - Assets (public/...)
 *
 * Chạy: npx tsx scripts/validate-content.ts
 */

import * as fs from "fs";
import * as path from "path";
import mysql from "mysql2/promise";

// Colors for console
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
  header: (msg: string) =>
    console.log(
      `\n${colors.cyan}${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}${colors.reset}`,
    ),
};

interface ValidationResult {
  type: "error" | "warning";
  category: "db" | "content" | "asset" | "import";
  message: string;
  path?: string;
}

async function validateContent() {
  const results: ValidationResult[] = [];

  log.header("🔍 VALIDATE CONTENT - Kiểm tra đồng bộ DB ↔ Content ↔ Assets");

  // Connect to database
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "1900100co",
    database: process.env.MYSQL_DATABASE || "pylearn_arena",
  });

  try {
    // 1. Lấy tất cả games từ DB
    console.log("\n📊 Đang lấy dữ liệu từ database...");
    const [games]: any = await conn.query(
      `SELECT g.id, g.slug, g.path, g.title,
              l.slug as lesson_slug,
              t.slug as topic_slug,
              c.slug as course_slug
       FROM games g
       INNER JOIN lessons l ON g.lesson_id = l.id
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       ORDER BY c.slug, t.order_num, l.order_num, g.order_num`,
    );

    console.log(`   Tìm thấy ${games.length} games trong database\n`);

    // 2. Kiểm tra từng game
    log.header("📁 Kiểm tra Content Files");

    const contentDir = path.join(process.cwd(), "src/content");
    const publicDir = path.join(process.cwd(), "public");
    const playGamePath = path.join(
      process.cwd(),
      "src/components/PlayGameContent.tsx",
    );

    // Đọc PlayGameContent để check imports
    let playGameContent = "";
    if (fs.existsSync(playGamePath)) {
      playGameContent = fs.readFileSync(playGamePath, "utf-8");
    }

    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const game of games) {
      const gamePath = game.path;
      const contentPath = path.join(contentDir, gamePath, "index.ts");
      const assetPath = path.join(publicDir, gamePath);

      // Check content file exists
      if (!fs.existsSync(contentPath)) {
        results.push({
          type: "error",
          category: "content",
          message: `Missing content file for game "${game.title}"`,
          path: `src/content/${gamePath}/index.ts`,
        });
        log.error(`[${game.slug}] Missing: src/content/${gamePath}/index.ts`);
        errorCount++;
      } else {
        // Check if imported in PlayGameContent
        const importPattern = `@/content/${gamePath}/index`;
        if (!playGameContent.includes(importPattern)) {
          results.push({
            type: "warning",
            category: "import",
            message: `Game "${game.title}" not imported in PlayGameContent.tsx`,
            path: gamePath,
          });
          log.warn(`[${game.slug}] Not imported in PlayGameContent.tsx`);
          warningCount++;
        } else {
          log.success(`[${game.slug}] Content OK: ${gamePath}`);
          validCount++;
        }
      }

      // Check asset folder (optional - just warning)
      if (!fs.existsSync(assetPath)) {
        // Không phải lỗi, chỉ cảnh báo
        // Nhiều game không cần assets
      }
    }

    // 3. Kiểm tra orphan content (có file nhưng không có trong DB)
    log.header("🔎 Kiểm tra Orphan Content (files không có trong DB)");

    const dbPaths = new Set(games.map((g: any) => g.path));
    const orphanPaths: string[] = [];

    // Scan content directory
    const scanDir = (dir: string, relativePath: string = "") => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = relativePath ? `${relativePath}/${item}` : item;

        if (fs.statSync(fullPath).isDirectory()) {
          // Check if this is a game folder (has index.ts)
          const indexPath = path.join(fullPath, "index.ts");
          if (fs.existsSync(indexPath)) {
            // This might be a game folder
            if (!dbPaths.has(relPath) && !relPath.startsWith("_template")) {
              orphanPaths.push(relPath);
            }
          }
          // Continue scanning subdirectories
          if (!item.startsWith("_")) {
            scanDir(fullPath, relPath);
          }
        }
      }
    };

    scanDir(contentDir);

    if (orphanPaths.length > 0) {
      for (const orphan of orphanPaths) {
        results.push({
          type: "warning",
          category: "content",
          message: `Orphan content (not in DB): ${orphan}`,
          path: `src/content/${orphan}`,
        });
        log.warn(`Orphan: src/content/${orphan}/index.ts`);
        warningCount++;
      }
    } else {
      log.success("Không có orphan content");
    }

    // 4. Kiểm tra path format
    log.header("📐 Kiểm tra Path Format");

    for (const game of games) {
      const expectedPath = `${game.course_slug}/${game.topic_slug}/${game.lesson_slug}`;
      if (!game.path.startsWith(expectedPath)) {
        results.push({
          type: "warning",
          category: "db",
          message: `Path không theo format chuẩn: ${game.path}`,
          path: game.path,
        });
        log.warn(
          `[${game.slug}] Path: "${game.path}" != expected: "${expectedPath}/..."`,
        );
        warningCount++;
      }
    }

    // 5. Summary
    log.header("📊 KẾT QUẢ TỔNG HỢP");

    console.log(`
   ✅ Valid:    ${validCount} games
   ❌ Errors:   ${errorCount}
   ⚠️  Warnings: ${warningCount}
   📁 Total:    ${games.length} games trong DB
`);

    if (errorCount > 0) {
      console.log(
        `\n${colors.red}🚨 Có ${errorCount} lỗi cần sửa!${colors.reset}`,
      );
      console.log("\nĐể sửa lỗi thiếu content file:");
      console.log("  1. Chạy: npx tsx scripts/add-complete-game.ts");
      console.log("  2. Hoặc tạo file thủ công theo template\n");
      process.exit(1);
    } else if (warningCount > 0) {
      console.log(
        `\n${colors.yellow}⚠️  Có ${warningCount} cảnh báo cần xem xét${colors.reset}\n`,
      );
    } else {
      console.log(`\n${colors.green}🎉 Tất cả đều OK!${colors.reset}\n`);
    }

    // Return results for CI/CD integration
    return {
      success: errorCount === 0,
      errors: errorCount,
      warnings: warningCount,
      valid: validCount,
      results,
    };
  } finally {
    await conn.end();
  }
}

// Run
validateContent().catch((err) => {
  log.error(`Script failed: ${err.message}`);
  process.exit(1);
});
