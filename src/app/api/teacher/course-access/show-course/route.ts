import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";

// POST /api/teacher/course-access/show-course - Hiện khóa học cho lớp
export const POST = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { user } = context;
      const body = await request.json();
      const { classId, courseId } = body;

      if (!classId || !courseId) {
        return errorResponse("Missing classId or courseId", 400);
      }

      // Tạo course_access để hiện khóa học
      await pool.query(
        `INSERT INTO course_access (class_id, course_id, granted_at)
         VALUES (?, ?, NOW())
         ON CONFLICT (class_id, course_id) DO UPDATE SET
           granted_at = NOW(),
           is_active = TRUE`,
        [classId, courseId],
      );

      return successResponse({ classId, courseId }, "Đã hiện khóa học cho lớp");
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
