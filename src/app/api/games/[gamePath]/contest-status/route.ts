/**
 * API: Kiểm tra game có đang được mở cuộc thi không
 *
 * Được gọi từ game để quyết định có hiển thị nút "Nộp code" không
 *
 * GET /api/games/[gamePath]/contest-status
 */
import { NextResponse } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  ContestGameService,
  ContestSubmissionService,
} from "@/lib/services/contests";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET - Kiểm tra trạng thái cuộc thi của game
export const GET = withAuth(async (request, context) => {
  try {
    const { user, params } = context;
    const gamePath = params?.gamePath || "";
    const decodedPath = decodeURIComponent(gamePath);

    // Tìm game theo path
    const [games] = await pool.query<RowDataPacket[]>(
      "SELECT id, title FROM games WHERE game_path = ?",
      [decodedPath],
    );

    if (games.length === 0) {
      return successResponse({
        isInContest: false,
        contest: null,
        userBestSubmission: null,
      });
    }

    const gameId = games[0].id;

    // Kiểm tra game có trong cuộc thi active không
    const { isInContest, contest } =
      await ContestGameService.isGameInActiveContest(gameId, user!.id);

    if (!isInContest || !contest) {
      return successResponse({
        isInContest: false,
        contest: null,
        userBestSubmission: null,
      });
    }

    // Lấy bài nộp tốt nhất của user cho game này
    const userBestSubmission = await ContestSubmissionService.getBestSubmission(
      contest.id,
      gameId,
      user!.id,
    );

    // Lấy rankings nếu cho phép
    let rankings = null;
    if (contest.show_ranking) {
      rankings = await ContestSubmissionService.getGameRankings(
        contest.id,
        gameId,
      );
    }

    return successResponse({
      isInContest: true,
      contest: {
        id: contest.id,
        title: contest.title,
        contestCode: contest.contest_code,
        allowResubmit: contest.allow_resubmit,
        maxAttempts: contest.max_attempts,
        showRanking: contest.show_ranking,
        endTime: contest.end_time,
      },
      gameId,
      userBestSubmission,
      rankings,
    });
  } catch (error) {
    console.error("Error checking contest status:", error);
    return errorResponse("Lỗi server", 500);
  }
});
