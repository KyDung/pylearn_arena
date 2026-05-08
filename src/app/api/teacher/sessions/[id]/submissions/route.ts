import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

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

      // Get best submissions only (one per user) with rankings
      const [rows] = await pool.query<RowDataPacket[]>(
        `WITH best_submissions AS (
           SELECT 
             user_id,
             MAX(score) as best_score,
             COUNT(*) as total_attempts
           FROM session_submissions 
           WHERE session_id = ?
           GROUP BY user_id
         ),
         ranked_submissions AS (
           SELECT 
             s.*,
             ROW_NUMBER() OVER (
               PARTITION BY s.user_id 
               ORDER BY s.score DESC, s.submitted_at ASC
             ) as rn
           FROM session_submissions s
           WHERE s.session_id = ?
         )
         SELECT 
           rs.id,
           rs.user_id,
           rs.code,
           rs.score,
           rs.passed_tests,
           rs.total_tests,
           rs.is_correct,
           rs.execution_time,
           rs.error_message,
           rs.submitted_at,
           rs.attempt_number,
           u.username,
           u.full_name,
           RANK() OVER (
             ORDER BY rs.score DESC, rs.submitted_at ASC
           ) as ranking,
           bs.total_attempts
         FROM ranked_submissions rs
         INNER JOIN users u ON rs.user_id = u.id
         INNER JOIN best_submissions bs ON rs.user_id = bs.user_id
         WHERE rs.rn = 1
         ORDER BY rs.score DESC, rs.submitted_at ASC`,
        [sessionId, sessionId],
      );

      return successResponse({ submissions: rows });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
