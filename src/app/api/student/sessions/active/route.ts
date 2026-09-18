import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import SessionService from "@/lib/services/sessions";

import { getErrorMessage } from "@/lib/errors";
// GET /api/student/sessions/active - Lấy active sessions cho học sinh
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const sessions = await SessionService.getActiveSessionsForStudent(
        user.id,
      );
      return successResponse(sessions); // Return sessions directly as data
    } catch (error) {
      return errorResponse(getErrorMessage(error), 500);
    }
  },
  ["student"],
);
