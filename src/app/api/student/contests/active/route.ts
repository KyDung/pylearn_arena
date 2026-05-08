import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/student/contests/active - Lấy danh sách cuộc thi active cho học sinh
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      // Lấy các cuộc thi:
      // 1. Status = 'active'
      // 2. Trong thời gian (start_time <= now <= end_time hoặc null)
      // 3. Public (class_id = NULL) hoặc học sinh thuộc lớp đó
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT
          c.*,
          u.full_name as creator_name,
          cl.name as class_name,
          co.title as course_title,
          l.title as lesson_title,
          (SELECT COUNT(*) FROM contest_games WHERE contest_id = c.id AND is_active = TRUE) as game_count,
          (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = c.id AND user_id = ?) as my_submission_count
         FROM contests c
         LEFT JOIN users u ON u.id = c.created_by
         LEFT JOIN classes cl ON cl.id = c.class_id
         LEFT JOIN courses co ON co.id = c.course_id
         LEFT JOIN lessons l ON l.id = c.lesson_id
         LEFT JOIN class_members cm ON cm.class_id = c.class_id AND cm.user_id = ? AND cm.status = 'active'
         WHERE c.status = 'active'
           AND (c.start_time IS NULL OR c.start_time <= NOW())
           AND (c.end_time IS NULL OR c.end_time > NOW())
           AND (c.class_id IS NULL OR cm.id IS NOT NULL)
         ORDER BY c.created_at DESC`,
        [user.id, user.id],
      );

      return successResponse({ contests: rows });
    } catch (error: any) {
      console.error("Error fetching active contests:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
