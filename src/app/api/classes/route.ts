import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getClasses,
  getClassesByStudent,
  createClass,
  type ClassFilters,
} from "@/lib/services/classes";
import type { ClassStatus } from "@/types";

// GET /api/classes - Lấy danh sách lớp học
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url);

  // Students only see their own classes
  if (user.role === "student") {
    const classes = await getClassesByStudent(user.id);
    return successResponse({
      items: classes,
      total: classes.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
  }

  const filters: ClassFilters = {
    status: searchParams.get("status") as ClassStatus | undefined,
    schoolYear: searchParams.get("schoolYear") || undefined,
    grade: searchParams.get("grade") || undefined,
    search: searchParams.get("search") || undefined,
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
  };

  // Teachers only see their own classes
  if (user.role === "teacher") {
    filters.teacherId = user.id;
  }

  const result = await getClasses(filters);
  return successResponse(result);
}, "authenticated");

// POST /api/classes - Tạo lớp mới
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { name, description, schoolYear, grade, maxStudents } = body;

    if (!name) {
      return errorResponse("Tên lớp là bắt buộc");
    }

    const newClass = await createClass({
      name,
      description,
      teacherId: user.id,
      schoolYear,
      grade,
      maxStudents,
    });

    return successResponse(newClass, "Tạo lớp thành công");
  },
  ["admin", "teacher"],
);
