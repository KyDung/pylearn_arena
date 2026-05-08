import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";

// GET /api/student/sessions - Lấy danh sách active sessions cho student
export const GET = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { user } = context;

      const sessions = await SessionService.getActiveSessionsForStudent(
        user.id,
      );

      return successResponse(sessions);
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
