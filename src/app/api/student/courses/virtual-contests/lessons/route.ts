import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import ContestService from "@/lib/services/contests-new";

// GET /api/student/courses/virtual-contests/lessons - Lấy danh sách contests như lessons
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;

      // Lấy ongoing contests
      const contests = await ContestService.getOngoingContestsForStudent(
        user.id,
      );

      // Format như lessons để FE dễ xử lý
      const lessons = contests.map((contest: any) => ({
        id: `contest-${contest.id}`,
        title: contest.title,
        description:
          contest.description || `Cuộc thi từ lớp ${contest.class_name}`,
        duration: contest.remaining_minutes,
        status: contest.status,
        type: "contest",
        contest_id: contest.id,
        game_id: contest.game_id,
        game_title: contest.game_title,
        game_path: contest.game_path,
        class_name: contest.class_name,
        start_time: contest.start_time,
        end_time: contest.end_time,
        remaining_minutes: contest.remaining_minutes,
        prizes: contest.prizes,
        max_submissions: contest.max_submissions,
        is_started: contest.is_started,
        is_ended: contest.is_ended,
      }));

      return successResponse({
        lessons,
        total: lessons.length,
      });
    } catch (error: any) {
      console.error("Get contests as lessons error:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
