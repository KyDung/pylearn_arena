import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/teacher/sessions/[id]/submissions - Xem submissions của session
export const GET = withAuth(
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
          "You don't have permission to view these submissions",
          403,
        );
      }

      // One submission per student per session, ranked by score then time.
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
           COALESCE(s.attempt_number, 1) as attempt_number,
           u.username,
           u.full_name,
           RANK() OVER (
             ORDER BY s.score DESC, s.submitted_at ASC
           ) as ranking,
           1 as total_attempts
         FROM session_submissions s
         INNER JOIN users u ON s.user_id = u.id
         WHERE s.session_id = ?
         ORDER BY s.score DESC, s.submitted_at ASC`,
        [sessionId],
      );

      return successResponse({ submissions: rows });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch submissions";
      return errorResponse(message, 500);
    }
  },
  ["admin", "teacher"],
);
