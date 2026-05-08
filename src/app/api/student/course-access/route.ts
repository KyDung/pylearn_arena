import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/student/course-access?courseId=X - Lấy danh sách content đã unlock cho student
export const GET = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { user } = context;
      const { searchParams } = new URL(request.url);
      const courseId = searchParams.get("courseId");

      if (!courseId) {
        return errorResponse("Missing courseId", 400);
      }

      // Lấy các lớp mà student tham gia
      const [classes] = await pool.query<RowDataPacket[]>(
        `SELECT class_id FROM class_members WHERE user_id = ? AND status = 'active'`,
        [user.id],
      );

      if (classes.length === 0) {
        return successResponse({ topics: [], lessons: [] });
      }

      const classIds = classes.map((c) => c.class_id);

      // Lấy topics đã unlock
      const [topics] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT content_id 
         FROM course_content_access 
         WHERE class_id IN (?) 
           AND course_id = ? 
           AND content_type = 'topic' 
           AND is_unlocked = TRUE`,
        [classIds, courseId],
      );

      // Lấy lessons đã unlock
      const [lessons] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT content_id 
         FROM course_content_access 
         WHERE class_id IN (?) 
           AND course_id = ? 
           AND content_type = 'lesson' 
           AND is_unlocked = TRUE`,
        [classIds, courseId],
      );

      return successResponse({
        topics: topics.map((t) => String(t.content_id)),
        lessons: lessons.map((l) => String(l.content_id)),
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
