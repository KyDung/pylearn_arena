import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import ContestService from "@/lib/services/contests-new";

// GET /api/student/contests - Lấy danh sách ongoing contests
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;

      const contests = await ContestService.getOngoingContestsForStudent(
        user.id,
      );

      return successResponse({ contests });
    } catch (error) {
      console.error("Get student contests error:", error);
      return errorResponse("Failed to fetch contests", 500);
    }
  },
  ["student"],
);
