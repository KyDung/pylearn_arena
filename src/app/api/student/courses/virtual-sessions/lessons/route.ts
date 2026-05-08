import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";

// GET /api/student/courses/virtual-sessions/lessons - Lấy danh sách sessions như lessons
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;

      // Lấy active sessions
      const sessions = await SessionService.getActiveSessionsForStudent(
        user.id,
      );

      // Format như lessons để FE dễ xử lý
      const lessons = sessions.map((session: any) => ({
        id: `session-${session.id}`,
        title: session.title,
        description:
          session.description || `Bài kiểm tra từ lớp ${session.class_name}`,
        duration: session.remaining_minutes || session.duration_minutes,
        status: session.status,
        type: "session",
        session_id: session.id,
        game_id: session.game_id,
        game_title: session.game_title,
        game_path: session.game_path,
        class_name: session.class_name,
        started_at: session.started_at,
        remaining_minutes: session.remaining_minutes,
      }));

      return successResponse({
        lessons,
        total: lessons.length,
      });
    } catch (error: any) {
      console.error("Get sessions as lessons error:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
