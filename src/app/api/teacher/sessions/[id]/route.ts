import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";
import pool from "@/lib/db";

// DELETE /api/teacher/sessions/[id] - Xóa session
export const DELETE = withAuth(
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
          "You don't have permission to delete this session",
          403,
        );
      }

      // Check if session exists
      const session = await SessionService.getSessionById(sessionId);
      if (!session) {
        return errorResponse("Session not found", 404);
      }

      // Delete session and related data in transaction
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Delete all submissions first
        await connection.query(
          "DELETE FROM session_submissions WHERE session_id = ?",
          [sessionId],
        );

        // Delete the session
        await connection.query("DELETE FROM sessions WHERE id = ?", [
          sessionId,
        ]);

        await connection.commit();

        return successResponse(
          { sessionId },
          `Session "${session.title}" has been deleted successfully`,
        );
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
