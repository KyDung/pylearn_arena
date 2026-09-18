import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import SessionService from "@/lib/services/sessions";
import type { User } from "@/types";

import { getErrorMessage } from "@/lib/errors";
// PUT /api/teacher/sessions/[id]/close - Đóng session
export const PUT = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const sessionId = id ? parseInt(id) : 0;
      const { user } = context;

      if (!sessionId) {
        return errorResponse("Invalid session ID", 400);
      }

      // Check permission
      const canManage = await SessionService.canManageSession(
        sessionId,
        user.id,
        user.role,
      );

      if (!canManage) {
        return errorResponse(
          "You don't have permission to close this session",
          403,
        );
      }

      const success = await SessionService.closeSession(sessionId);

      if (!success) {
        return errorResponse("Session not found or already closed", 404);
      }

      return successResponse(null, "Session closed successfully");
    } catch (error) {
      return errorResponse(getErrorMessage(error), 500);
    }
  },
  ["admin", "teacher"],
);
