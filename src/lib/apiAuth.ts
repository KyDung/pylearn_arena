import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { UserRole, User, ApiResponse } from "@/types";
import { getUserById } from "@/lib/services/users";

const JWT_SECRET =
  process.env.JWT_SECRET || "pylearn-secret-key-change-in-production";

// ============================================================
// JWT TOKEN HELPERS
// ============================================================

export interface TokenPayload {
  userId: number;
  username: string;
  role: UserRole;
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// ============================================================
// GET CURRENT USER FROM REQUEST
// ============================================================

export async function getCurrentUser(
  request: NextRequest,
): Promise<User | null> {
  // Try to get token from cookie
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    // Try Authorization header
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const bearerToken = authHeader.slice(7);
      const payload = verifyToken(bearerToken);
      if (payload) {
        return getUserById(payload.userId);
      }
    }
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler = (
  request: NextRequest,
  context: { params?: Record<string, string>; user: User },
) => Promise<NextResponse<ApiResponse<any>>>;

export function withAuth(
  handler: ApiHandler,
  requiredRole: RoleCheck = "authenticated",
) {
  return async (
    request: NextRequest,
    context: { params?: Promise<Record<string, string>> },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<NextResponse<ApiResponse<any>>> => {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Chưa đăng nhập" },
        { status: 401 },
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Tài khoản đã bị khóa" },
        { status: 403 },
      );
    }

    if (!checkRole(user.role, requiredRole)) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    // Await params if it's a Promise
    const params = context.params ? await context.params : undefined;

    try {
      return await handler(request, { params, user });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Lỗi server",
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
