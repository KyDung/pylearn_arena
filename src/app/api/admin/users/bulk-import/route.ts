import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { bulkCreateUsers } from "@/lib/services/users";

interface BulkUserData {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role: "student" | "teacher" | "admin";
}

// POST /api/admin/users/bulk-import
// Import nhiều users từ CSV hoặc text
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const body = await request.json();
      const { content, format } = body;

      if (!content) {
        return errorResponse("Nội dung file là bắt buộc");
      }

      // Parse content based on format
      let users: BulkUserData[] = [];

      if (format === "csv") {
        // CSV format: username,password,fullName,email,role
        const lines = content.trim().split("\n");
        const hasHeader = lines[0].toLowerCase().includes("username");
        const dataLines = hasHeader ? lines.slice(1) : lines;

        users = dataLines
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const [username, password, fullName, email, role] = line
              .split(",")
              .map((s) => s.trim());

            if (!username || !password) {
              throw new Error(`Thiếu username hoặc password: ${line}`);
            }

            return {
              username,
              password,
              fullName: fullName || undefined,
              email: email || undefined,
              role: (role as any) || "student",
            };
          });
      } else if (format === "txt") {
        // TXT format: username password [fullName] [email] [role]
        const lines = content.trim().split("\n");

        users = lines
          .filter((line: string) => line.trim() && !line.startsWith("#"))
          .map((line: string) => {
            const parts = line.trim().split(/\s+/);
            const [username, password, fullName, email, role] = parts;

            if (!username || !password) {
              throw new Error(`Thiếu username hoặc password: ${line}`);
            }

            return {
              username,
              password,
              fullName: fullName || undefined,
              email: email || undefined,
              role: (role as any) || "student",
            };
          });
      } else {
        return errorResponse("Format không hợp lệ. Chỉ hỗ trợ csv hoặc txt");
      }

      if (users.length === 0) {
        return errorResponse("Không tìm thấy dữ liệu hợp lệ");
      }

      // Validate permissions
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

      // Create users
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
