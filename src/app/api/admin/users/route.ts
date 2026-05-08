import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  getUsers,
  createUser,
  getUserStats,
  type UserFilters,
} from "@/lib/services/users";
import type { UserRole, UserStatus } from "@/types";

// GET /api/admin/users - Lấy danh sách users
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);

    const filters: UserFilters = {
      role: searchParams.get("role") as UserRole | undefined,
      status: searchParams.get("status") as UserStatus | undefined,
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
    };

    // Teachers can only see their own students
    if (user.role === "teacher") {
      filters.createdBy = user.id;
      filters.role = "student";
    }

    const result = await getUsers(filters);
    return successResponse(result);
  },
  ["admin", "teacher"],
);

// POST /api/admin/users - Tạo user mới
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const { username, password, fullName, email, role, phone } = body;

    if (!username || !password) {
      return errorResponse("Username và password là bắt buộc");
    }

    // Teachers can only create students
    if (user.role === "teacher" && role !== "student") {
      return errorResponse("Giáo viên chỉ có thể tạo tài khoản học sinh");
    }

    // Only admin can create teachers or admins
    if ((role === "teacher" || role === "admin") && user.role !== "admin") {
      return errorResponse(
        "Chỉ admin mới có thể tạo tài khoản giáo viên hoặc admin",
      );
    }

    try {
      const newUser = await createUser({
        username,
        password,
        fullName,
        email,
        role: role || "student",
        phone,
        createdBy: user.id,
      });

      return successResponse(newUser, "Tạo tài khoản thành công");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Duplicate")) {
        return errorResponse("Username đã tồn tại");
      }
      throw error;
    }
  },
  ["admin", "teacher"],
);
