import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/teacher/courses/[courseId]/lessons - Lấy danh sách lessons của course
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;
      const courseId = context.params?.courseId;

      if (!courseId) {
        return errorResponse("Invalid course ID", 400);
      }

      if (user.role !== "teacher" && user.role !== "admin") {
        return errorResponse("Access denied", 403);
      }

      // Lấy danh sách lessons với topics
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          l.id,
          l.course_id,
          l.title,
          l.description,
          l.order_index,
          l.topic_id,
          t.title as topic_title
         FROM lessons l
         LEFT JOIN topics t ON l.topic_id = t.id
         WHERE l.course_id = ?
         ORDER BY t.order_index ASC, l.order_index ASC`,
        [courseId],
      );

      return successResponse({ lessons: rows });
    } catch (error: any) {
      console.error("Get lessons error:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["teacher", "admin"],
);
