import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// GET /api/teacher/courses - Lấy danh sách courses cho teacher
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;

      if (user.role !== "teacher" && user.role !== "admin") {
        return errorResponse("Access denied", 403);
      }

      // Admin và Teacher đều thấy tất cả courses published
      const query = `
        SELECT DISTINCT 
          c.id,
          c.slug,
          c.title,
          c.description
        FROM courses c
        WHERE c.is_published = 1
        ORDER BY c.title ASC
      `;

      const [rows] = await pool.query<RowDataPacket[]>(query);

      return successResponse(rows);
    } catch (error: any) {
      console.error("Get courses error:", error);
      return errorResponse(error.message, 500);
    }
  },
  ["teacher", "admin"],
);
