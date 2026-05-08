import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import ContestService from "@/lib/services/contests-new";

// GET /api/teacher/contests/[id] - Lấy chi tiết contest
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const contestId = id ? parseInt(id) : 0;
      const { user } = context;

      if (!contestId) {
        return errorResponse("Invalid contest ID", 400);
      }

      const contest = await ContestService.getContestById(contestId);
      if (!contest) {
        return errorResponse("Contest not found", 404);
      }

      // Check permission
      const canManage = await ContestService.canManageContest(
        contestId,
        user.id,
        user.role,
      );
      if (!canManage) {
        return errorResponse("Access denied", 403);
      }

      // Get leaderboard
      const leaderboard = await ContestService.getLeaderboard(contestId);

      return successResponse({ contest, leaderboard });
    } catch (error) {
      console.error("Get contest error:", error);
      return errorResponse("Failed to fetch contest", 500);
    }
  },
  ["teacher", "admin"],
);

// PATCH /api/teacher/contests/[id] - Cập nhật contest
export const PATCH = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const contestId = id ? parseInt(id) : 0;
      const { user } = context;

      if (!contestId) {
        return errorResponse("Invalid contest ID", 400);
      }

      // Check permission
      const canManage = await ContestService.canManageContest(
        contestId,
        user.id,
        user.role,
      );
      if (!canManage) {
        return errorResponse("Access denied", 403);
      }

      const body = await request.json();
      const updated = await ContestService.updateContest(contestId, body);

      if (!updated) {
        return errorResponse("Failed to update contest", 500);
      }

      const contest = await ContestService.getContestById(contestId);

      return successResponse({ contest }, "Contest updated successfully");
    } catch (error) {
      console.error("Update contest error:", error);
      return errorResponse("Failed to update contest", 500);
    }
  },
  ["teacher", "admin"],
);

// DELETE /api/teacher/contests/[id] - Xóa contest
export const DELETE = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const contestId = id ? parseInt(id) : 0;
      const { user } = context;

      if (!contestId) {
        return errorResponse("Invalid contest ID", 400);
      }

      // Check permission
      const canManage = await ContestService.canManageContest(
        contestId,
        user.id,
        user.role,
      );
      if (!canManage) {
        return errorResponse("Access denied", 403);
      }

      const deleted = await ContestService.deleteContest(contestId);

      if (!deleted) {
        return errorResponse("Contest not found", 404);
      }

      return successResponse({ deleted: true }, "Contest deleted successfully");
    } catch (error) {
      console.error("Delete contest error:", error);
      return errorResponse("Failed to delete contest", 500);
    }
  },
  ["teacher", "admin"],
);
