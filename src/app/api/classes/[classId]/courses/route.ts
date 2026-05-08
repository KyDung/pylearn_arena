import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getClassCourses,
  addCourseToClass,
  removeCourseFromClass,
} from "@/lib/services/courseAccess";
import { getClassById } from "@/lib/services/classes";

// GET /api/classes/[classId]/courses - Lấy danh sách khóa học của lớp
export const GET = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Invalid class ID");

    const classData = await getClassById(classId);
    if (!classData) return errorResponse("Class not found", 404);

    // Check permission
    if (user.role !== "admin" && !canManageClass(user, classData.teacherId)) {
      return errorResponse("Forbidden", 403);
    }

    const courses = await getClassCourses(classId);
    return successResponse(courses);
  },
  ["admin", "teacher"],
);

// POST /api/classes/[classId]/courses - Thêm khóa học vào lớp
export const POST = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Invalid class ID");

    const classData = await getClassById(classId);
    if (!classData) return errorResponse("Class not found", 404);

    // Check permission
    if (user.role !== "admin" && !canManageClass(user, classData.teacherId)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) return errorResponse("Course ID is required");

    await addCourseToClass(classId, parseInt(courseId), user.id);
    return successResponse(null, "Course added to class successfully");
  },
  ["admin", "teacher"],
);

// DELETE /api/classes/[classId]/courses - Xóa khóa học khỏi lớp
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Invalid class ID");

    const classData = await getClassById(classId);
    if (!classData) return errorResponse("Class not found", 404);

    // Check permission
    if (user.role !== "admin" && !canManageClass(user, classData.teacherId)) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const courseId = parseInt(searchParams.get("courseId") || "0");

    if (!courseId) return errorResponse("Course ID is required");

    await removeCourseFromClass(classId, courseId);
    return successResponse(null, "Course removed from class successfully");
  },
  ["admin", "teacher"],
);
