import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import ContestService from "@/lib/services/contests-new";
import type { ContestFilters } from "@/lib/services/contests-new";
import { canManageClassById } from "@/lib/classAccess";

// GET /api/teacher/contests - Lấy danh sách contests
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

      const { searchParams } = new URL(request.url);
      const class_id = searchParams.get("class_id");
      const status = searchParams.get("status");
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");

      const filters: ContestFilters = { page, pageSize };

      if (class_id) filters.class_id = parseInt(class_id);
      if (status) {
        if (!["draft", "published", "ongoing", "ended", "archived"].includes(status)) {
          return errorResponse("Invalid contest status", 400);
        }
        filters.status = status as ContestFilters["status"];
      }

      // Teacher chỉ thấy contests của mình
      if (user.role === "teacher") {
        filters.created_by = user.id;
      }

      const result = await ContestService.getContests(filters);

      return successResponse(result);
    } catch (error) {
      console.error("Get contests error:", error);
      return errorResponse("Failed to fetch contests", 500);
    }
  },
  ["teacher", "admin"],
);

// POST /api/teacher/contests - Tạo contest mới
export const POST = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;

      if (user.role !== "teacher" && user.role !== "admin") {
        return errorResponse("Access denied", 403);
      }

      const body = await request.json();
      const {
        class_id,
        game_id,
        title,
        description,
        start_time,
        end_time,
        result_announce_time,
        max_submissions,
        allow_late_submission,
        late_penalty_percent,
        show_leaderboard,
        show_leaderboard_scores,
        prizes,
        status,
      } = body;

      if (!class_id || !game_id || !title || !start_time || !end_time) {
        return errorResponse("Missing required fields", 400);
      }

      if (!await canManageClassById(user, Number(class_id))) {
        return errorResponse("Không có quyền quản lý lớp này", 403);
      }

      // Validate dates
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate >= endDate) {
        return errorResponse("Start time must be before end time", 400);
      }

      const contestId = await ContestService.createContest({
        class_id: parseInt(class_id),
        game_id: parseInt(game_id),
        title,
        description,
        start_time: startDate,
        end_time: endDate,
        result_announce_time: result_announce_time
          ? new Date(result_announce_time)
          : undefined,
        max_submissions: max_submissions ? parseInt(max_submissions) : 10,
        allow_late_submission: allow_late_submission === true,
        late_penalty_percent: late_penalty_percent
          ? parseFloat(late_penalty_percent)
          : 20.0,
        show_leaderboard: show_leaderboard !== false,
        show_leaderboard_scores: show_leaderboard_scores === true,
        prizes: prizes || null,
        status: status || "draft",
        created_by: user.id,
      });

      const contest = await ContestService.getContestById(contestId);

      return successResponse({ contest }, "Contest created successfully");
    } catch (error) {
      console.error("Create contest error:", error);
      return errorResponse("Failed to create contest", 500);
    }
  },
  ["teacher", "admin"],
);
