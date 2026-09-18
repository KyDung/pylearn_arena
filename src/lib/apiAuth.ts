import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { UserRole, User, ApiResponse } from "@/types";
import { getUserById } from "@/lib/services/users";

import { verifyToken } from "@/lib/authToken";
export { createToken, verifyToken } from "@/lib/authToken";
export type { TokenPayload } from "@/lib/authToken";

// ============================================================
// GET CURRENT USER FROM REQUEST
// ============================================================

export async function getCurrentUser(
  request: NextRequest,
): Promise<User | null> {
  // Try to get token from cookie
  const cookieStore = await cookies();
  const authHeader = request.headers.get("Authorization");
  const token = cookieStore.get("auth-token")?.value ||
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.userId);
  // Also protects local authoring routes which call getCurrentUser directly.
  return user?.status === "active" ? user : null;
}

// ============================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================

export type RoleCheck = UserRole | UserRole[] | "authenticated";

export function checkRole(userRole: UserRole, required: RoleCheck): boolean {
  if (required === "authenticated") return true;
  if (Array.isArray(required)) return required.includes(userRole);
  return userRole === required;
}

// ============================================================
// API ROUTE WRAPPER WITH AUTH
// ============================================================

type ApiHandler = (
  request: NextRequest,
  context: { params?: Record<string, string>; user: User },
) => Promise<NextResponse>;

export function withAuth(
  handler: ApiHandler,
  requiredRole: RoleCheck = "authenticated",
) {
  return async (
    request: NextRequest,
    context: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Chưa đăng nhập hoặc tài khoản đã bị khóa" },
          { status: 401 },
        );
      }
      if (!checkRole(user.role, requiredRole)) {
        return NextResponse.json(
          { success: false, error: "Không có quyền truy cập" },
          { status: 403 },
        );
      }
      const params = context.params ? await context.params : undefined;
      return await handler(request, { params, user });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Lỗi server",
        },
        { status: 500 },
      );
    }
  };
}

// ============================================================
// HELPER RESPONSES
// ============================================================

export function successResponse<T>(
  data: T,
  message?: string,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message });
}

export function errorResponse(
  error: string,
  status = 400,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}

export function notFoundResponse(
  entity = "Không tìm thấy",
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: entity }, { status: 404 });
}

// ============================================================
// PERMISSION CHECKS
// ============================================================

export function canManageClass(user: User, classTeacherId: number): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && user.id === classTeacherId) return true;
  return false;
}

export function canManageUser(actor: User, target: User): boolean {
  return actor.role === "admin" || (
    actor.role === "teacher" && target.role === "student" &&
    target.createdBy === actor.id
  );
}

export function canViewSubmission(
  user: User,
  submissionUserId: number,
  classTeacherId: number,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && user.id === classTeacherId) return true;
  if (user.id === submissionUserId) return true;
  return false;
}

/**
 * Kiểm tra quyền quản lý cuộc thi
 * - Admin: toàn quyền
 * - Teacher: chỉ cuộc thi mình tạo
 */
export function canManageContest(
  user: User,
  contestCreatorId: number,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "teacher" && user.id === contestCreatorId) return true;
  return false;
}

/**
 * Kiểm tra xem user có phải admin không
 */
export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

/**
 * Kiểm tra xem user có quyền xem tất cả không (admin)
 */
export function canViewAll(user: User): boolean {
  return user.role === "admin";
}
