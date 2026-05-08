import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import SessionService from "@/lib/services/sessions";

// PUT /api/teacher/sessions/[id]/close - Đóng session
export const PUT = withAuth(
  async (
    request: NextRequest,
    context: { params: Promise<{ id: string }>; user: any },
  ) => {
    try {
      const { id } = await context.params;
      const sessionId = parseInt(id);
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
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
