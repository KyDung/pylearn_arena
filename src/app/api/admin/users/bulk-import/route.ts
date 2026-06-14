import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { bulkCreateUsers } from "@/lib/services/users";
import type { UserRole } from "@/types";

interface BulkUserData {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role: UserRole;
}

const isValidRole = (role: unknown): role is UserRole =>
  role === "student" || role === "teacher" || role === "admin";

const normalizeUser = (
  user: Partial<BulkUserData>,
  rowLabel: string,
): BulkUserData => {
  const username = String(user.username || "").trim();
  const password = String(user.password || "").trim();
  const role = String(user.role || "student").trim().toLowerCase();

  if (!username || !password) {
    throw new Error(`Thiếu username hoặc password: ${rowLabel}`);
  }

  if (!isValidRole(role)) {
    throw new Error(`Role không hợp lệ cho ${username}: ${role}`);
  }

  return {
    username,
    password,
    fullName: user.fullName ? String(user.fullName).trim() : undefined,
    email: user.email ? String(user.email).trim() : undefined,
    role,
  };
};

const parseUsersFromContent = (
  content: string,
  format: string,
): BulkUserData[] => {
  const normalizedContent = content.replace(/^\uFEFF/, "").trim();

  if (format === "csv") {
    const lines = normalizedContent.split(/\r?\n/);
    const hasHeader = lines[0]?.toLowerCase().includes("username");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
      .filter((line) => line.trim())
      .map((line) => {
        const [username, password, fullName, email, role] = line
          .split(",")
          .map((s) => s.trim());

        return normalizeUser(
          { username, password, fullName, email, role: role as UserRole },
          line,
        );
      });
  }

  if (format === "txt") {
    const lines = normalizedContent.split(/\r?\n/);

    return lines
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const [username, password, fullName, email, role] = line
          .trim()
          .split(/\s+/);

        return normalizeUser(
          { username, password, fullName, email, role: role as UserRole },
          line,
        );
      });
  }

  throw new Error("Format không hợp lệ. Chỉ hỗ trợ csv hoặc txt");
};

// POST /api/admin/users/bulk-import
// Accepts either parsed users from the preview UI or raw CSV/TXT content.
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = await request.json();
      const format = String(body.format || "csv").toLowerCase();
      let users: BulkUserData[] = [];

      if (Array.isArray(body.users)) {
        users = body.users.map((item: Partial<BulkUserData>, index: number) =>
          normalizeUser(item, `Dòng ${index + 1}`),
        );
      } else if (typeof body.content === "string" && body.content.trim()) {
        users = parseUsersFromContent(body.content, format);
      } else {
        return errorResponse("Nội dung file là bắt buộc");
      }

      if (users.length === 0) {
        return errorResponse("Không tìm thấy dữ liệu hợp lệ");
      }

      const invalidRoles = users.filter((u) => {
        if (user.role === "teacher") {
          return u.role !== "student";
        }
        return false;
      });

      if (invalidRoles.length > 0) {
        return errorResponse(
          "Giáo viên chỉ có thể tạo tài khoản học sinh. " +
            `Có ${invalidRoles.length} tài khoản không hợp lệ.`,
        );
      }

      const result = await bulkCreateUsers(users, user.id);

      return successResponse(
        result,
        `Tạo thành công ${result.success} tài khoản. ${result.failed} thất bại.`,
      );
    } catch (error: any) {
      return errorResponse(error.message || "Lỗi khi import users");
    }
  },
  ["admin", "teacher"],
);
