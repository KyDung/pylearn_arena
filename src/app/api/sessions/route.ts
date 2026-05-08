import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  LessonSessionService,
  LessonService,
  GameService,
} from "@/lib/services/courses";

// GET /api/sessions - Lấy sessions của teacher
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    if (user.role === "student") {
      return errorResponse("Không có quyền", 403);
    }

    const sessions = await LessonSessionService.getTeacherSessions(user.id);
    return successResponse(sessions);
  },
  ["admin", "teacher"],
);

// POST /api/sessions - Tạo session mới cho bài học
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    if (user.role === "student") {
      return errorResponse("Không có quyền tạo session", 403);
    }

    const body = await request.json();
    const { lessonId, gameId, durationMinutes = 30 } = body;

    if (!lessonId || !gameId) {
      return errorResponse("lessonId và gameId là bắt buộc");
    }

    // Verify lesson and game exist
    const lesson = await LessonService.getLessonById(lessonId);
    if (!lesson) return errorResponse("Không tìm thấy bài học", 404);

    const game = await GameService.getGameById(gameId);
    if (!game) return errorResponse("Không tìm thấy game", 404);

    // Check for active session
    const activeSession = await LessonSessionService.getActiveSession(lessonId);
    if (activeSession) {
      return successResponse(activeSession, "Đã có session đang hoạt động");
    }

    // Create new session
    const session = await LessonSessionService.createSession(
      lessonId,
      gameId,
      user.id,
      durationMinutes,
    );

    return successResponse(
      { ...session, lesson_title: lesson.title, game_title: game.title },
      `Đã tạo session. Mã code: ${session.session_code}`,
    );
  },
  ["admin", "teacher"],
);
