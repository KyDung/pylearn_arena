import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  ContestService,
  ContestGameService,
  ContestSubmissionService,
} from "@/lib/services/contests";

// GET /api/student/contests/[contestId] - Lấy chi tiết cuộc thi cho học sinh
export const GET = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params?: Record<string, string>; user: any },
  ) => {
    try {
      const contestId = params?.contestId || "0";
      const id = parseInt(contestId);

      const contest = await ContestService.getContestById(id);
      if (!contest) {
        return errorResponse("Không tìm thấy cuộc thi", 404);
      }

      // Kiểm tra cuộc thi có active không
      if (contest.status !== "active") {
        return errorResponse("Cuộc thi không khả dụng", 403);
      }

      // Kiểm tra thời gian
      const now = new Date();
      if (contest.start_time && new Date(contest.start_time) > now) {
        return errorResponse("Cuộc thi chưa bắt đầu", 403);
      }
      if (contest.end_time && new Date(contest.end_time) < now) {
        return errorResponse("Cuộc thi đã kết thúc", 403);
      }

      // Kiểm tra quyền truy cập (nếu có class_id)
      if (contest.class_id) {
        const pool = (await import("@/lib/db")).default;
        const [memberCheck] = await pool.query<any>(
          `SELECT 1 FROM class_members 
           WHERE class_id = ? AND user_id = ? AND status = 'active'`,
          [contest.class_id, user.id],
        );
        if (memberCheck.length === 0) {
          return errorResponse("Bạn không có quyền tham gia cuộc thi này", 403);
        }
      }

      // Lấy danh sách games
      const games = await ContestGameService.getContestGames(id);

      // Lấy submissions của user
      const userSubmissions = await ContestSubmissionService.getUserSubmissions(
        id,
        user.id,
      );

      // Lấy rankings nếu được hiển thị
      let rankings: any[] = [];
      if (contest.show_ranking) {
        rankings = await ContestSubmissionService.getContestRankings(id);
      }

      // Tính toán progress của user
      const completedGames = new Set(
        userSubmissions.filter((s) => s.is_correct).map((s) => s.game_id),
      );

      return successResponse({
        contest,
        games: games.map((g) => ({
          ...g,
          isCompleted: completedGames.has(g.game_id),
          myBestScore:
            userSubmissions
              .filter((s) => s.game_id === g.game_id)
              .reduce((max, s) => Math.max(max, s.score), 0) || 0,
          myAttempts: userSubmissions.filter((s) => s.game_id === g.game_id)
            .length,
        })),
        rankings,
        myProgress: {
          completedGames: completedGames.size,
          totalGames: games.length,
          totalScore: userSubmissions.reduce(
            (sum, s) => sum + (s.is_correct ? s.score : 0),
            0,
          ),
        },
      });
    } catch (error: any) {
      console.error("Error fetching contest:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
