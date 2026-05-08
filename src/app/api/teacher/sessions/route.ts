import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import SessionService from "@/lib/services/sessions";
import type { SessionFilters } from "@/lib/services/sessions";

// GET /api/teacher/sessions - Lấy danh sách sessions
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);

    // Nếu có session_id, trả về session đơn lẻ
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      const session = await SessionService.getSessionById(parseInt(sessionId));
      if (!session) {
        return errorResponse("Session not found", 404);
      }

      // Check permission
      if (user.role === "teacher") {
        const canManage = await SessionService.canManageSession(
          parseInt(sessionId),
          user.id,
          user.role,
        );
        if (!canManage) {
          return errorResponse("Access denied", 403);
        }
      }

      return successResponse({ sessions: [session] });
    }

    const filters: SessionFilters = {
      class_id: searchParams.get("class_id")
        ? parseInt(searchParams.get("class_id")!)
        : undefined,
      game_id: searchParams.get("game_id")
        ? parseInt(searchParams.get("game_id")!)
        : undefined,
      status: searchParams.get("status") as "active" | "closed" | undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
    };

    // Teacher chỉ thấy sessions của lớp mình tạo
    if (user.role === "teacher") {
      filters.created_by = user.id;
    }

    const result = await SessionService.getSessions(filters);
    return successResponse(result);
  },
  ["admin", "teacher"],
);

// POST /api/teacher/sessions - Tạo session mới
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = await request.json();
      const { class_id, game_id, title, description, duration_minutes } = body;

      if (!class_id || !game_id || !title) {
        return errorResponse("Missing required fields", 400);
      }

      // Check if teacher owns this class (admin skip)
      if (user.role === "teacher") {
        const [rows]: any = await (
          await import("@/lib/db")
        ).default.query(
          "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
          [class_id, user.id],
        );
        if (rows.length === 0) {
          return errorResponse("You don't have permission for this class", 403);
        }
      }

      const sessionId = await SessionService.createSession({
        class_id: parseInt(class_id),
        game_id: parseInt(game_id),
        title,
        description,
        duration_minutes: duration_minutes
          ? parseInt(duration_minutes)
          : undefined,
        created_by: user.id,
      });

      return successResponse({ sessionId }, "Session created successfully");
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
