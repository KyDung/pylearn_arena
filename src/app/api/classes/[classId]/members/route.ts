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
  getClassMembers,
  addClassMember,
  removeClassMember,
  bulkAddClassMembers,
} from "@/lib/services/classes";

// GET /api/classes/[classId]/members - Lấy danh sách thành viên
export const GET = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Class ID không hợp lệ");

    const cls = await getClassById(classId);
    if (!cls) return notFoundResponse("Không tìm thấy lớp");

    // Check permission
    if (user.role === "teacher" && !canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền xem lớp này", 403);
    }

    const members = await getClassMembers(classId);
    return successResponse(members);
  },
  ["admin", "teacher"],
);

// POST /api/classes/[classId]/members - Thêm thành viên
export const POST = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Class ID không hợp lệ");

    const cls = await getClassById(classId);
    if (!cls) return notFoundResponse("Không tìm thấy lớp");

    if (!canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền quản lý lớp này", 403);
    }

    const body = await request.json();

    // Bulk add
    if (body.userIds && Array.isArray(body.userIds)) {
      const result = await bulkAddClassMembers(
        classId,
        body.userIds,
        body.role || "student",
      );
      return successResponse(result, `Đã thêm ${result.added} học sinh`);
    }

    // Single add
    if (body.userId) {
      const member = await addClassMember(
        classId,
        body.userId,
        body.role || "student",
      );
      return successResponse(member, "Đã thêm thành viên");
    }

    return errorResponse("userId hoặc userIds là bắt buộc");
  },
  ["admin", "teacher"],
);

// DELETE /api/classes/[classId]/members - Xóa thành viên
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    if (!classId) return errorResponse("Class ID không hợp lệ");

    const cls = await getClassById(classId);
    if (!cls) return notFoundResponse("Không tìm thấy lớp");

    if (!canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền quản lý lớp này", 403);
    }

    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get("userId") || "0");

    if (!userId) return errorResponse("userId là bắt buộc");

    await removeClassMember(classId, userId);
    return successResponse(null, "Đã xóa thành viên");
  },
  ["admin", "teacher"],
);
