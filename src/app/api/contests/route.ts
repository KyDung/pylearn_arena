/**
 * API: Quản lý cuộc thi (Contest)
 *
 * GET  - Lấy danh sách cuộc thi (admin/teacher)
 * POST - Tạo cuộc thi mới
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { ContestService, ContestGameService } from "@/lib/services/contests";

// GET - Lấy danh sách cuộc thi
export const GET = withAuth(async (request, context) => {
  try {
    const { user } = context;
    if (user.role !== "admin" && user.role !== "teacher") {
      return errorResponse("Không có quyền truy cập", 403);
    }

    let contests;
    if (user.role === "admin") {
      contests = await ContestService.getAllContests();
    } else {
      contests = await ContestService.getContestsByCreator(user.id);
    }

    return successResponse(contests);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return errorResponse("Lỗi server", 500);
  }
});

// POST - Tạo cuộc thi mới
export const POST = withAuth(async (request, context) => {
  try {
    const { user } = context;
    if (user.role !== "admin" && user.role !== "teacher") {
      return errorResponse("Không có quyền truy cập", 403);
    }

    const body = await request.json();
    const {
      title,
      description,
      classId,
      courseId,
      lessonId,
      openAllGames,
      gameIds, // Mảng game_id nếu không mở tất cả
      startTime,
      endTime,
      showRanking,
      allowResubmit,
      maxAttempts,
    } = body;

    if (!title) {
      return errorResponse("Vui lòng nhập tiêu đề cuộc thi", 400);
    }

    // Tạo cuộc thi
    const contest = await ContestService.createContest({
      title,
      description,
      createdBy: user.id,
      classId,
      courseId,
      lessonId,
      openAllGames: openAllGames || false,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      showRanking: showRanking !== false,
      allowResubmit: allowResubmit !== false,
      maxAttempts,
    });

    // Thêm games vào cuộc thi
    if (openAllGames && lessonId) {
      // Mở tất cả game trong bài học
      await ContestGameService.addAllLessonGames(contest.id, lessonId);
    } else if (gameIds && Array.isArray(gameIds)) {
      // Mở từng game được chọn
      for (const gameId of gameIds) {
        await ContestGameService.addGameToContest(contest.id, gameId);
      }
    }

    // Lấy lại contest với đầy đủ thông tin
    const fullContest = await ContestService.getContestById(contest.id);

    return successResponse(fullContest);
  } catch (error) {
    console.error("Error creating contest:", error);
    return errorResponse("Lỗi server", 500);
  }
});
