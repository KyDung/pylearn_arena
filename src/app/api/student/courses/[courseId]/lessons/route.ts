import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/student/courses/[courseId]/lessons - Lấy danh sách lessons được phép truy cập
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const courseId = context.params?.courseId;
      const { user } = context;

      if (!courseId) {
        return errorResponse("Course ID is required", 400);
      }

      // Kiểm tra xem student có quyền truy cập course này không
      const [courseAccess] = await pool.query<RowDataPacket[]>(
        `SELECT 1
         FROM course_access ca
         INNER JOIN class_members cm ON ca.class_id = cm.class_id
         WHERE ca.course_id = ? 
           AND cm.user_id = ? 
           AND cm.status = 'active'
           AND ca.is_active = TRUE`,
        [courseId, user.id],
      );

      if (courseAccess.length === 0) {
        return errorResponse("You don't have access to this course", 403);
      }

      // Lấy danh sách lessons được unlock cho student
      const [lessons] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT
           l.id,
           l.title,
           l.description,
           l.slug,
           l.order_index,
           l.is_published,
           l.difficulty_level,
           l.estimated_duration,
           t.title as topic_title,
           t.slug as topic_slug,
           cca.unlocked_at,
           CASE 
             WHEN cca.is_unlocked = TRUE THEN true 
             ELSE false 
           END as is_unlocked
         FROM lessons l
         INNER JOIN topics t ON l.topic_id = t.id
         LEFT JOIN course_content_access cca ON (
           cca.course_id = ? 
           AND cca.class_id IN (
             SELECT class_id FROM class_members 
             WHERE user_id = ? AND status = 'active'
           )
           AND cca.content_type = 'lesson' 
           AND cca.content_id = l.id
         )
         WHERE t.course_id = ?
           AND l.is_published = TRUE
           AND (cca.is_unlocked = TRUE OR cca.is_unlocked IS NULL)
         ORDER BY t.order_index, l.order_index`,
        [courseId, user.id, courseId],
      );

      return successResponse({ lessons });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
