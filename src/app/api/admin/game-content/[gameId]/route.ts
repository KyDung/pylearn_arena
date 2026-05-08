import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import fs from "fs/promises";
import path from "path";

// GET /api/admin/game-content/[gameId] - Get game content file
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    const gameId = context.params?.gameId;
    if (!gameId) return errorResponse("Invalid game ID");

    try {
      // Decode URI component in case path has special characters
      const decodedGameId = decodeURIComponent(gameId);
      console.log("[API] Loading game content for:", decodedGameId);

      // Game path format: python-basics/chapter-1/t10-cd-b12/id1
      // Convert to file path: src/content/python-basics/chapter-1/t10-cd-b12/id1/index.ts
      const contentPath = path.join(
        process.cwd(),
        "src",
        "content",
        decodedGameId,
        "index.ts",
      );

      console.log("[API] Content path:", contentPath);

      const content = await fs.readFile(contentPath, "utf-8");
      console.log("[API] Content loaded successfully");

      // Parse GAME_CONFIG to extract title and description
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      const descMatch = content.match(/description:\s*`([^`]+)`/);

      const title = titleMatch ? titleMatch[1] : "";
      const description = descMatch ? descMatch[1].trim() : "";

      return successResponse({
        gameId: decodedGameId,
        path: decodedGameId,
        title,
        description,
      });
    } catch (error: any) {
      console.error("[API] Error loading game content:", error);
      if (error.code === "ENOENT") {
        return errorResponse("Game content file not found", 404);
      }
      return errorResponse(error.message, 500);
    }
  },
  ["admin"],
);

// PUT /api/admin/game-content/[gameId] - Update game content file
export const PUT = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    const gameId = context.params?.gameId;
    if (!gameId) return errorResponse("Invalid game ID");

    try {
      const body = await request.json();
      const { title, description } = body;

      if (!title || !description) {
        return errorResponse("Title and description are required");
      }

      // Decode URI component in case path has special characters
      const decodedGameId = decodeURIComponent(gameId);

      const contentPath = path.join(
        process.cwd(),
        "src",
        "content",
        decodedGameId,
        "index.ts",
      );

      // Read current content
      const currentContent = await fs.readFile(contentPath, "utf-8");

      // Backup old file
      const backupPath = contentPath + `.backup.${Date.now()}`;
      try {
        await fs.copyFile(contentPath, backupPath);
      } catch (err) {
        console.warn("Could not create backup:", err);
      }

      // Replace title and description in GAME_CONFIG
      let newContent = currentContent;

      // Replace title (handle both single and double quotes)
      newContent = newContent.replace(
        /title:\s*["']([^"']+)["']/,
        `title: "${title.replace(/"/g, '\\"')}"`,
      );

      // Replace description (handle backticks)
      newContent = newContent.replace(
        /description:\s*`([^`]+)`/,
        `description: \`${description}\``,
      );

      // Write new content
      await fs.writeFile(contentPath, newContent, "utf-8");

      return successResponse({
        gameId: decodedGameId,
        message: "Content updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating game content:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["admin"],
);
