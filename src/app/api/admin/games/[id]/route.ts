import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import { GameService } from "@/lib/services/courses";

// GET /api/admin/games/[id] - Get game details
export const GET = withAuth(
  async (request: NextRequest, { params }) => {
    const gameId = params?.id;
    if (!gameId) return errorResponse("Invalid game ID");

    const game = await GameService.getGameById(gameId);
    if (!game) return notFoundResponse("Game not found");

    return successResponse(game);
  },
  ["admin"],
);

// PUT /api/admin/games/[id] - Update game metadata
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    const gameId = params?.id;
    if (!gameId) return errorResponse("Invalid game ID");

    const body = await request.json();
    const { title, description, path, order_num } = body;

    const updated = await GameService.updateGame(gameId, {
      title,
      description,
      path,
      order_num,
    });

    if (!updated) return notFoundResponse("Game not found or no changes");

    return successResponse(updated, "Game updated successfully");
  },
  ["admin"],
);
