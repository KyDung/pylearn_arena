/**
 * API: Quản lý cuộc thi cụ thể
 *
 * GET    - Lấy thông tin cuộc thi + games + rankings
 * PUT    - Cập nhật cuộc thi
 * DELETE - Xóa cuộc thi
 * PATCH  - Thay đổi trạng thái (active/closed)
 */
import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  canManageContest,
} from "@/lib/apiAuth";
import {
  ContestService,
  ContestGameService,
  ContestSubmissionService,
} from "@/lib/services/contests";

// GET - Lấy thông tin chi tiết cuộc thi
export const GET = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    // Kiểm tra quyền xem
    if (user.role !== "admin" && contest.created_by !== user.id) {
      // Học sinh chỉ xem được cuộc thi active
      if (contest.status !== "active") {
        return errorResponse("Cuộc thi không khả dụng", 403);
      }
    }

    // Lấy danh sách games
    const games = await ContestGameService.getContestGames(id);

    // Lấy rankings
    const rankings = await ContestSubmissionService.getContestRankings(id);

    // Nếu là học sinh, lấy thêm submissions của họ
    let userSubmissions = null;
    if (user.role === "student") {
      userSubmissions = await ContestSubmissionService.getUserSubmissions(
        id,
        user.id,
      );
    }

    return successResponse({
      contest,
      games,
      rankings: contest.show_ranking || user.role !== "student" ? rankings : [],
      userSubmissions,
    });
  } catch (error) {
    console.error("Error fetching contest:", error);
    return errorResponse("Lỗi server", 500);
  }
});

// PUT - Cập nhật cuộc thi
export const PUT = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    if (user.role !== "admin" && user.role !== "teacher") {
      return errorResponse("Không có quyền truy cập", 403);
    }

    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    // Chỉ creator hoặc admin mới được sửa
    if (user.role !== "admin" && contest.created_by !== user.id) {
      return errorResponse("Không có quyền sửa cuộc thi này", 403);
    }

    const body = await request.json();
    const {
      title,
      description,
      classId,
      courseId,
      lessonId,
      openAllGames,
      gameIds,
      startTime,
      endTime,
      showRanking,
      allowResubmit,
      maxAttempts,
    } = body;

    // Cập nhật thông tin cuộc thi
    await ContestService.updateContest(id, {
      title,
      description,
      classId,
      courseId,
      lessonId,
      openAllGames,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      showRanking,
      allowResubmit,
      maxAttempts,
    });

    // Nếu có thay đổi games
    if (openAllGames && lessonId) {
      // Xóa games cũ và thêm tất cả games của bài học
      const currentGames = await ContestGameService.getContestGames(id);
      for (const game of currentGames) {
        await ContestGameService.removeGameFromContest(id, game.game_id);
      }
      await ContestGameService.addAllLessonGames(id, lessonId);
    } else if (gameIds && Array.isArray(gameIds)) {
      // Cập nhật danh sách games
      const currentGames = await ContestGameService.getContestGames(id);
      const currentGameIds = currentGames.map((g) => g.game_id);

      // Xóa games không còn trong list
      for (const gameId of currentGameIds) {
        if (!gameIds.includes(gameId)) {
          await ContestGameService.removeGameFromContest(id, gameId);
        }
      }

      // Thêm games mới
      for (const gameId of gameIds) {
        if (!currentGameIds.includes(gameId)) {
          await ContestGameService.addGameToContest(id, gameId);
        }
      }
    }

    const fullContest = await ContestService.getContestById(id);
    return successResponse(fullContest);
  } catch (error) {
    console.error("Error updating contest:", error);
    return errorResponse("Lỗi server", 500);
  }
});

// PATCH - Thay đổi trạng thái
export const PATCH = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    if (user.role !== "admin" && user.role !== "teacher") {
      return errorResponse("Không có quyền truy cập", 403);
    }

    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    if (user.role !== "admin" && contest.created_by !== user.id) {
      return errorResponse("Không có quyền thay đổi cuộc thi này", 403);
    }

    const body = await request.json();
    const { action } = body;

    let updatedContest;
    switch (action) {
      case "activate":
        updatedContest = await ContestService.activateContest(id);
        break;
      case "close":
        updatedContest = await ContestService.closeContest(id);
        break;
      default:
        return errorResponse("Action không hợp lệ", 400);
    }

    return successResponse(updatedContest);
  } catch (error) {
    console.error("Error changing contest status:", error);
    return errorResponse("Lỗi server", 500);
  }
});

// DELETE - Xóa cuộc thi
export const DELETE = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    if (user.role !== "admin" && user.role !== "teacher") {
      return errorResponse("Không có quyền truy cập", 403);
    }

    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    if (user.role !== "admin" && contest.created_by !== user.id) {
      return errorResponse("Không có quyền xóa cuộc thi này", 403);
    }

    await ContestService.deleteContest(id);

    return successResponse({ message: "Đã xóa cuộc thi" });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return errorResponse("Lỗi server", 500);
  }
});
