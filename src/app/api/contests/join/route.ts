import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { ContestService } from "@/lib/services/contests";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/contests/join?code=ABC123 - Tham gia cuộc thi bằng mã
export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(request.url);
      const code = searchParams.get("code")?.toUpperCase();

      if (!code) {
        return errorResponse("Vui lòng nhập mã cuộc thi", 400);
      }

      // Tìm cuộc thi theo mã
      const contest = await ContestService.getContestByCode(code);
      if (!contest) {
        return errorResponse("Không tìm thấy cuộc thi với mã này", 404);
      }

      // Kiểm tra cuộc thi có active không
      if (contest.status !== "active") {
        return errorResponse("Cuộc thi chưa mở hoặc đã đóng", 403);
      }

      // Kiểm tra thời gian
      const now = new Date();
      if (contest.start_time && new Date(contest.start_time) > now) {
        return errorResponse("Cuộc thi chưa bắt đầu", 403);
      }
      if (contest.end_time && new Date(contest.end_time) < now) {
        return errorResponse("Cuộc thi đã kết thúc", 403);
      }

      // Kiểm tra quyền truy cập (nếu giới hạn theo lớp)
      if (contest.class_id) {
        const [memberCheck] = await pool.query<RowDataPacket[]>(
          `SELECT 1 FROM class_members 
           WHERE class_id = ? AND user_id = ? AND status = 'active'`,
          [contest.class_id, user.id],
        );
        if (memberCheck.length === 0) {
          return errorResponse(
            "Bạn không thuộc lớp được phép tham gia cuộc thi này",
            403,
          );
        }
      }

      return successResponse({
        contestId: contest.id,
        title: contest.title,
      });
    } catch (error: any) {
      console.error("Error joining contest:", error);
      return errorResponse(error.message || "Lỗi server", 500);
    }
  },
  ["student"],
);
