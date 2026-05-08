import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";

// POST /api/teacher/course-access/hide-course - Ẩn khóa học khỏi lớp
export const POST = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { user } = context;
      const body = await request.json();
      const { classId, courseId } = body;

      if (!classId || !courseId) {
        return errorResponse("Missing classId or courseId", 400);
      }

      // Xóa course_access để ẩn khóa học
      await pool.query(
        `DELETE FROM course_access WHERE class_id = ? AND course_id = ?`,
        [classId, courseId],
      );

      // Xóa luôn course_content_access
      await pool.query(
        `DELETE FROM course_content_access WHERE class_id = ? AND course_id = ?`,
        [classId, courseId],
      );

      return successResponse({ classId, courseId }, "Đã ẩn khóa học khỏi lớp");
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
