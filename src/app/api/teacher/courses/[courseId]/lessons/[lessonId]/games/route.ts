import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/teacher/courses/[courseId]/lessons/[lessonId]/games - Lấy danh sách games của lesson
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;
      const courseId = context.params?.courseId;
      const lessonId = context.params?.lessonId;

      if (!courseId || !lessonId) {
        return errorResponse("Invalid course or lesson ID", 400);
      }

      if (user.role !== "teacher" && user.role !== "admin") {
        return errorResponse("Access denied", 403);
      }

      // Lấy danh sách games
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT 
          g.id,
          g.lesson_id,
          g.course_id,
          g.title,
          g.description,
          g.order_index,
          g.game_type,
          g.path
         FROM games g
         WHERE g.course_id = ? AND g.lesson_id = ?
         ORDER BY g.order_index ASC`,
        [courseId, lessonId],
      );

      return successResponse({ games: rows });
    } catch (error: any) {
      console.error("Get games error:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["teacher", "admin"],
);
