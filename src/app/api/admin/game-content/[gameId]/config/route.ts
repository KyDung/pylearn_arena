import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import fs from "fs/promises";
import path from "path";

interface TestCase {
  input: string;
  expected: string;
  description: string;
  sceneText: string;
}

function parseTestCases(fileContent: string): TestCase[] {
  const testCases: TestCase[] = [];
  // Match each object inside the testCases array
  const arrayMatch = fileContent.match(/testCases:\s*\[([\s\S]*?)\],?\s*\n\s*(?:\/\/|starterCode|hints|sceneAssets|phaser)/);
  if (!arrayMatch) return testCases;

  const arrayBody = arrayMatch[1];
  // Match individual objects { ... }
  const objectRegex = /\{([^}]+)\}/g;
  let m;
  while ((m = objectRegex.exec(arrayBody)) !== null) {
    const body = m[1];
    const getField = (key: string) => {
      const r = new RegExp(`${key}:\\s*(?:"([^"]*?)"|'([^']*?)'|\`([^\`]*?)\`)`);
      const match = body.match(r);
      return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
    };
    testCases.push({
      input: getField("input"),
      expected: getField("expected"),
      description: getField("description"),
      sceneText: getField("sceneText"),
    });
  }
  return testCases;
}

function formatTestCases(testCases: TestCase[]): string {
  return testCases
    .map((tc, index) => {
      const escape = (s: string) => s.replace(/"/g, '\\"');
      const inputStr = `"${escape(String(tc.input))}"`;
      const expectedStr = `"${escape(String(tc.expected))}"`;
      const descStr = `"${escape(tc.description || `Test case ${index + 1}`)}"`;
      const sceneStr = `"${escape(tc.sceneText || `Level ${index + 1}`)}"`;
      return `    {\n      input: ${inputStr},\n      expected: ${expectedStr},\n      description: ${descStr},\n      sceneText: ${sceneStr},\n    }`;
    })
    .join(",\n");
}

// GET /api/admin/game-content/[gameId]/config - Read full GAME_CONFIG
export const GET = withAuth(
  async (
    _request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    const gameId = context.params?.gameId;
    if (!gameId) return errorResponse("Invalid game ID");

    try {
      const decodedGameId = decodeURIComponent(gameId);
      const contentPath = path.join(
        process.cwd(),
        "src",
        "content",
        decodedGameId,
        "index.ts",
      );

      const content = await fs.readFile(contentPath, "utf-8");

      // Parse title
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : "";

      // Parse description (backtick string)
      const descMatch = content.match(/description:\s*`([\s\S]*?)`/);
      const description = descMatch ? descMatch[1].trim() : "";

      // Parse pythonFunction
      const fnMatch = content.match(/pythonFunction:\s*["']([^"']+)["']/);
      const pythonFunction = fnMatch ? fnMatch[1] : "";

      // Parse starterCode (backtick string)
      const starterMatch = content.match(/starterCode:\s*`([\s\S]*?)`/);
      const starterCode = starterMatch ? starterMatch[1] : "";

      // Parse testCases
      const testCases = parseTestCases(content);

      // Detect game type from file content
      const gameType = content.includes("pythonFunction:") ? "type1" : "type2";

      return successResponse({
        gameId: decodedGameId,
        title,
        description,
        pythonFunction,
        starterCode,
        testCases,
        gameType,
      });
    } catch (error: any) {
      if (error.code === "ENOENT") return errorResponse("Game file not found", 404);
      return errorResponse(error.message, 500);
    }
  },
  ["admin"],
);

// PUT /api/admin/game-content/[gameId]/config - Write full GAME_CONFIG
export const PUT = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    const gameId = context.params?.gameId;
    if (!gameId) return errorResponse("Invalid game ID");

    try {
      const body = await request.json();
      const { title, description, pythonFunction, starterCode, testCases } = body;

      const decodedGameId = decodeURIComponent(gameId);
      const contentPath = path.join(
        process.cwd(),
        "src",
        "content",
        decodedGameId,
        "index.ts",
      );

      let content = await fs.readFile(contentPath, "utf-8");

      // Backup before writing
      const backupPath = contentPath + `.backup.${Date.now()}`;
      await fs.copyFile(contentPath, backupPath).catch(() => {});

      // Update title
      if (title !== undefined) {
        content = content.replace(
          /title:\s*["']([^"']+)["']/,
          `title: "${title.replace(/"/g, '\\"')}"`,
        );
      }

      // Update description (backtick)
      if (description !== undefined) {
        content = content.replace(
          /description:\s*`([\s\S]*?)`/,
          `description: \`${description}\``,
        );
      }

      // Update pythonFunction
      if (pythonFunction !== undefined) {
        content = content.replace(
          /pythonFunction:\s*["']([^"']+)["']/,
          `pythonFunction: "${pythonFunction.replace(/"/g, '\\"')}"`,
        );
      }

      // Update starterCode (backtick)
      if (starterCode !== undefined) {
        content = content.replace(
          /starterCode:\s*`([\s\S]*?)`/,
          `starterCode: \`${starterCode.replace(/`/g, "\\`")}\``,
        );
      }

      // Update testCases array
      if (Array.isArray(testCases)) {
        const formatted = formatTestCases(testCases);
        // Replace the testCases array, stopping before next field
        content = content.replace(
          /testCases:\s*\[([\s\S]*?)\],?\s*\n(\s*(?:\/\/|starterCode|hints|sceneAssets|phaser))/,
          `testCases: [\n${formatted}\n  ],\n\n  $2`,
        );
      }

      await fs.writeFile(contentPath, content, "utf-8");

      return successResponse({ gameId: decodedGameId, message: "Config updated successfully" });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin"],
);
