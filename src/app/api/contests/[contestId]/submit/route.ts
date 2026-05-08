/**
 * API: Nộp bài vào cuộc thi
 *
 * POST - Học sinh nộp code vào cuộc thi
 * GET  - Lấy bảng xếp hạng của game trong cuộc thi
 */
import { NextResponse } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  ContestService,
  ContestGameService,
  ContestSubmissionService,
} from "@/lib/services/contests";

// POST - Nộp bài
export const POST = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const body = await request.json();
    const {
      gameId,
      code,
      score,
      passedTests,
      totalTests,
      isCorrect,
      executionTime,
    } = body;

    if (!gameId || code === undefined || score === undefined) {
      return errorResponse("Thiếu thông tin bài nộp", 400);
    }

    // Kiểm tra cuộc thi tồn tại và active
    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    // Kiểm tra game có trong cuộc thi không
    const contestGames = await ContestGameService.getContestGames(id);
    const isGameInContest = contestGames.some((g) => g.game_id === gameId);
    if (!isGameInContest) {
      return errorResponse("Game không nằm trong cuộc thi này", 400);
    }

    // Kiểm tra user có quyền tham gia không (nếu giới hạn theo lớp)
    if (contest.class_id) {
      const { isInContest } = await ContestGameService.isGameInActiveContest(
        gameId,
        user!.id,
      );
      if (!isInContest) {
        return errorResponse("Bạn không có quyền tham gia cuộc thi này", 403);
      }
    }

    // Nộp bài
    const submission = await ContestSubmissionService.submitToContest(
      id,
      gameId,
      user!.id,
      {
        code,
        score,
        passedTests: passedTests || 0,
        totalTests: totalTests || 0,
        isCorrect: isCorrect || false,
        executionTime,
      },
    );

    // Lấy rankings mới
    const rankings = await ContestSubmissionService.getGameRankings(id, gameId);

    return successResponse({
      submission,
      rankings,
    });
  } catch (error: any) {
    console.error("Error submitting to contest:", error);
    return errorResponse(error.message || "Lỗi server", 500);
  }
});

// GET - Lấy rankings của game trong cuộc thi
export const GET = withAuth(async (request, context) => {
  try {
    const { params } = context;
    const contestId = params?.contestId;
    const id = parseInt(contestId || "0");

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    const contest = await ContestService.getContestById(id);
    if (!contest) {
      return errorResponse("Không tìm thấy cuộc thi", 404);
    }

    // Nếu có gameId thì lấy rankings cho game đó
    if (gameId) {
      const rankings = await ContestSubmissionService.getGameRankings(
        id,
        parseInt(gameId),
      );
      return successResponse({ rankings });
    }

    // Không có gameId thì lấy rankings tổng hợp
    const rankings = await ContestSubmissionService.getContestRankings(id);
    return successResponse({ rankings });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return errorResponse("Lỗi server", 500);
  }
});
