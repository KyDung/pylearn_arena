import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/teacher/sessions/[id]/submissions/[userId] - Xem tất cả submissions của một user
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const userId = context.params?.userId;
      const sessionId = id ? parseInt(id) : 0;
      const targetUserId = userId ? parseInt(userId) : 0;
      const { user } = context;

      if (!sessionId || !targetUserId) {
        return errorResponse("Invalid session ID or user ID", 400);
      }

      // Check permission
      const canManage = await SessionService.canManageSession(
        sessionId,
        user.id,
        user.role,
      );

      if (!canManage) {
        return errorResponse(
          "You don't have permission to view these submissions",
          403,
        );
      }

      // Get all submissions of the user for this session
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          s.id,
          s.user_id,
          s.code,
          s.score,
          s.passed_tests,
          s.total_tests,
          s.is_correct,
          s.execution_time,
          s.error_message,
          s.submitted_at,
          s.attempt_number,
          u.username,
          u.full_name
         FROM session_submissions s
         INNER JOIN users u ON s.user_id = u.id
         WHERE s.session_id = ? AND s.user_id = ?
         ORDER BY s.submitted_at DESC`,
        [sessionId, targetUserId],
      );

      return successResponse({ submissions: rows });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
