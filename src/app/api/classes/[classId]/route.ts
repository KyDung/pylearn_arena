import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getClassById,
  updateClass,
  hardDeleteClass,
  getClassMembers,
  addClassMember,
  removeClassMember,
  bulkAddClassMembers,
} from "@/lib/services/classes";

// GET /api/classes/[classId] - Lấy thông tin lớp
export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  const classId = parseInt(params?.classId || "0");
  if (!classId) return errorResponse("Class ID không hợp lệ");

  const cls = await getClassById(classId);
  if (!cls) return notFoundResponse("Không tìm thấy lớp");

  // Check permission
  if (user.role === "student") {
    // Students can only view classes they belong to
    const members = await getClassMembers(classId);
    if (!members.some((m) => m.userId === user.id)) {
      return errorResponse("Không có quyền xem lớp này", 403);
    }
  } else if (user.role === "teacher" && !canManageClass(user, cls.teacherId)) {
    return errorResponse("Không có quyền xem lớp này", 403);
  }

  // Get members
  const members = await getClassMembers(classId);

  return successResponse({ ...cls, members });
}, "authenticated");

// PUT /api/classes/[classId] - Cập nhật lớp
export const PUT = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Class ID không hợp lệ");

    const cls = await getClassById(classId);
    if (!cls) return notFoundResponse("Không tìm thấy lớp");

    if (!canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền chỉnh sửa lớp này", 403);
    }

    const body = await request.json();
    const { name, description, schoolYear, grade, maxStudents, status } = body;

    const updated = await updateClass(classId, {
      name,
      description,
      schoolYear,
      grade,
      maxStudents,
      status,
    });
    return successResponse(updated, "Cập nhật thành công");
  },
  ["admin", "teacher"],
);

// DELETE /api/classes/[classId] - Archive hoặc xóa vĩnh viễn lớp
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Class ID không hợp lệ");

    const cls = await getClassById(classId);
    if (!cls) return notFoundResponse("Không tìm thấy lớp");

    if (!canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền xóa lớp này", 403);
    }

    // Check if permanent delete requested (query param)
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      // HARD DELETE - only for admin or archived classes
      if (user.role !== "admin" && cls.status !== "archived") {
        return errorResponse("Chỉ có thể xóa vĩnh viễn lớp đã lưu trữ");
      }
      await hardDeleteClass(classId);
      return successResponse(null, "Đã xóa vĩnh viễn lớp");
    } else {
      // SOFT DELETE - archive the class
      await updateClass(classId, { status: "archived" });
      return successResponse(null, "Đã lưu trữ lớp");
    }
  },
  ["admin", "teacher"],
);
