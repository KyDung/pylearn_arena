import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import {
  unlockContent,
  lockContent,
  getClassCourseAccess,
} from "@/lib/services/courseAccess";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/teacher/course-access - Lấy danh sách lớp và quyền truy cập
export const GET = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { searchParams } = new URL(request.url);
      const classId = searchParams.get("classId");
      const courseId = searchParams.get("courseId");

      // Nếu có classId và courseId, lấy chi tiết content access
      if (classId && courseId) {
        const access = await getClassCourseAccess(
          parseInt(classId),
          parseInt(courseId),
        );
        return successResponse(access);
      }

      // Lấy danh sách lớp học của giáo viên
      const { user } = context;
      const teacherFilter =
        user.role === "teacher" ? "AND c.teacher_id = ?" : "";
      const queryParams = user.role === "teacher" ? [user.id] : [];

      const [classes] = await pool.query<RowDataPacket[]>(
        `SELECT 
          c.id,
          c.name,
          c.description,
          COUNT(DISTINCT cm.user_id) as student_count,
          COUNT(DISTINCT ca.course_id) as course_count
         FROM classes c
         LEFT JOIN class_members cm ON c.id = cm.class_id AND cm.status = 'active'
         LEFT JOIN course_access ca ON c.id = ca.class_id
         WHERE c.status = 'active' ${teacherFilter}
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        queryParams,
      );

      return successResponse({ classes });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);

// POST /api/teacher/course-access/unlock - Mở khóa nội dung cho lớp
export const POST = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const { user } = context;
      const body = await request.json();
      const { classId, courseId, contentType, contentId } = body;

      if (!classId || !courseId || !contentType || !contentId) {
        return errorResponse("Missing required fields", 400);
      }

      if (!["topic", "lesson"].includes(contentType)) {
        return errorResponse("Invalid content type", 400);
      }

      await unlockContent(classId, courseId, contentType, contentId, user.id);

      return successResponse(
        { classId, courseId, contentType, contentId },
        `${contentType} has been unlocked for the class`,
      );
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);

// POST /api/teacher/course-access/lock - Khóa nội dung cho lớp
export const DELETE = withAuth(
  async (request: NextRequest, context: { user: User }) => {
    try {
      const body = await request.json();
      const { classId, courseId, contentType, contentId } = body;

      if (!classId || !courseId || !contentType || !contentId) {
        return errorResponse("Missing required fields", 400);
      }

      await lockContent(classId, courseId, contentType, contentId);

      return successResponse(
        { classId, courseId, contentType, contentId },
        `${contentType} has been locked for the class`,
      );
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["admin", "teacher"],
);
