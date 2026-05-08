import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import { LessonSessionService } from "@/lib/services/courses";

// GET /api/sessions/[code] - Lấy thông tin session bằng code
export const GET = withAuth(async (request: NextRequest, { params }) => {
  const code = params?.code;
  if (!code) return errorResponse("Session code không hợp lệ");

  const session = await LessonSessionService.getSessionByCode(code);
  if (!session) {
    return notFoundResponse("Session không tồn tại hoặc đã hết hạn");
  }

  const rankings = await LessonSessionService.getSessionRankings(session.id);

  return successResponse({
    session,
    rankings,
  });
}, "authenticated");

// POST /api/sessions/[code] - Nộp bài vào session
export const POST = withAuth(async (request: NextRequest, { params, user }) => {
  const code = params?.code;
  if (!code) return errorResponse("Session code không hợp lệ");

  const session = await LessonSessionService.getSessionByCode(code);
  if (!session) {
    return notFoundResponse("Session không tồn tại hoặc đã hết hạn");
  }

  const body = await request.json();
  const { code: submittedCode, score, isCorrect, executionTime } = body;

  if (score === undefined) {
    return errorResponse("score là bắt buộc");
  }

  const rankings = await LessonSessionService.submitToSession(
    session.id,
    user.id,
    {
      code: submittedCode || "",
      score,
      isCorrect: isCorrect || false,
      executionTime,
    },
  );

  // Find user's rank
  const userRank = rankings.find((r) => r.user_id === user.id);

  return successResponse(
    {
      rankings,
      userRank: userRank?.rank_position,
      userScore: userRank?.score,
    },
    `Đã nộp bài! Điểm: ${score}`,
  );
}, "authenticated");

// DELETE /api/sessions/[code] - Đóng session (chỉ teacher/admin)
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }) => {
    const code = params?.code;
    if (!code) return errorResponse("Session code không hợp lệ");

    const session = await LessonSessionService.getSessionByCode(code);
    if (!session) {
      return notFoundResponse("Session không tồn tại");
    }

    // Only creator or admin can close
    if (user.role !== "admin" && session.created_by !== user.id) {
      return errorResponse("Không có quyền đóng session này", 403);
    }

    await LessonSessionService.closeSession(session.id);
    return successResponse(null, "Đã đóng session");
  },
  ["admin", "teacher"],
);
