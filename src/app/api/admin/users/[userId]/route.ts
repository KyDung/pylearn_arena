import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import {
  getUserById,
  updateUser,
  updatePassword,
  suspendUser,
  activateUser,
  deleteUser,
  hardDeleteUser,
} from "@/lib/services/users";

// GET /api/admin/users/[userId] - Lấy thông tin user
export const GET = withAuth(
  async (request: NextRequest, { params, user: currentUser }) => {
    const userId = parseInt(params?.userId || "0");
    if (!userId) return errorResponse("User ID không hợp lệ");

    const targetUser = await getUserById(userId);
    if (!targetUser) return notFoundResponse("Không tìm thấy user");

    // Teachers can only view their students
    if (
      currentUser.role === "teacher" &&
      targetUser.createdBy !== currentUser.id
    ) {
      return errorResponse("Không có quyền xem thông tin user này", 403);
    }

    return successResponse(targetUser);
  },
  ["admin", "teacher"],
);

// PUT /api/admin/users/[userId] - Cập nhật user
export const PUT = withAuth(
  async (request: NextRequest, { params, user: currentUser }) => {
    const userId = parseInt(params?.userId || "0");
    if (!userId) return errorResponse("User ID không hợp lệ");

    const targetUser = await getUserById(userId);
    if (!targetUser) return notFoundResponse("Không tìm thấy user");

    // Teachers can only edit their students
    if (
      currentUser.role === "teacher" &&
      targetUser.createdBy !== currentUser.id
    ) {
      return errorResponse("Không có quyền chỉnh sửa user này", 403);
    }

    const body = await request.json();
    const { fullName, email, phone, avatar, status, newPassword } = body;

    // Update user info
    const updated = await updateUser(userId, {
      fullName,
      email,
      phone,
      avatar,
      status,
    });

    // Update password if provided
    if (newPassword) {
      await updatePassword(userId, newPassword);
    }

    return successResponse(updated, "Cập nhật thành công");
  },
  ["admin", "teacher"],
);

// DELETE /api/admin/users/[userId] - Xóa/suspend user
export const DELETE = withAuth(
  async (request: NextRequest, { params, user: currentUser }) => {
    const userId = parseInt(params?.userId || "0");
    if (!userId) return errorResponse("User ID không hợp lệ");

    const targetUser = await getUserById(userId);
    if (!targetUser) return notFoundResponse("Không tìm thấy user");

    // Cannot delete yourself
    if (userId === currentUser.id) {
      return errorResponse("Không thể xóa chính mình");
    }

    // Teachers can only delete their students
    if (
      currentUser.role === "teacher" &&
      targetUser.createdBy !== currentUser.id
    ) {
      return errorResponse("Không có quyền xóa user này", 403);
    }

    // Only admin can delete teachers/admins
    if (
      (targetUser.role === "teacher" || targetUser.role === "admin") &&
      currentUser.role !== "admin"
    ) {
      return errorResponse("Chỉ admin mới có thể xóa giáo viên hoặc admin");
    }

    // Check if permanent delete requested (query param)
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      // HARD DELETE - only for admin
      if (currentUser.role !== "admin") {
        return errorResponse("Chỉ admin mới có thể xóa vĩnh viễn");
      }
      await hardDeleteUser(userId);
      return successResponse(null, "Đã xóa vĩnh viễn user");
    } else {
      // SOFT DELETE - set status inactive
      await deleteUser(userId);
      return successResponse(null, "Đã xóa user");
    }
  },
  ["admin", "teacher"],
);

// PATCH /api/admin/users/[userId] - Actions: suspend, activate
export const PATCH = withAuth(
  async (request: NextRequest, { params, user: currentUser }) => {
    const userId = parseInt(params?.userId || "0");
    if (!userId) return errorResponse("User ID không hợp lệ");

    const targetUser = await getUserById(userId);
    if (!targetUser) return notFoundResponse("Không tìm thấy user");

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "suspend":
        await suspendUser(userId);
        return successResponse(null, "Đã khóa tài khoản");

      case "activate":
        await activateUser(userId);
        return successResponse(null, "Đã kích hoạt tài khoản");

      default:
        return errorResponse("Action không hợp lệ");
    }
  },
  ["admin", "teacher"],
);
