import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getAssignments,
  getAssignmentsForStudent,
  createAssignment,
  type AssignmentFilters,
} from "@/lib/services/assignments";
import { getClassById } from "@/lib/services/classes";
import type { AssignmentStatus } from "@/types";

// GET /api/assignments - Lấy danh sách bài tập
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url);

  // Students see their own assignments
  if (user.role === "student") {
    const assignments = await getAssignmentsForStudent(user.id);
    return successResponse({
      items: assignments,
      total: assignments.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
  }

  const filters: AssignmentFilters = {
    classId: searchParams.get("classId")
      ? parseInt(searchParams.get("classId")!)
      : undefined,
    gameId: searchParams.get("gameId")
      ? parseInt(searchParams.get("gameId")!)
      : undefined,
    status: searchParams.get("status") as AssignmentStatus | undefined,
    isActive:
      searchParams.get("isActive") === "true"
        ? true
        : searchParams.get("isActive") === "false"
          ? false
          : undefined,
    search: searchParams.get("search") || undefined,
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
  };

  // Teachers only see their own assignments
  if (user.role === "teacher") {
    filters.createdBy = user.id;
  }

  const result = await getAssignments(filters);
  return successResponse(result);
}, "authenticated");

// POST /api/assignments - Tạo bài tập mới
export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    const body = await request.json();
    const {
      classId,
      gameId,
      title,
      description,
      startTime,
      endTime,
      lateSubmission,
      latePenalty,
      maxAttempts,
      showRanking,
      showAnswersAfter,
    } = body;

    if (!classId || !gameId || !title || !startTime || !endTime) {
      return errorResponse(
        "classId, gameId, title, startTime, endTime là bắt buộc",
      );
    }

    // Check class ownership
    const cls = await getClassById(classId);
    if (!cls) {
      return errorResponse("Lớp không tồn tại");
    }

    if (!canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền tạo bài tập cho lớp này", 403);
    }

    const assignment = await createAssignment({
      classId,
      gameId,
      title,
      description,
      createdBy: user.id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      lateSubmission,
      latePenalty,
      maxAttempts,
      showRanking,
      showAnswersAfter,
    });

    return successResponse(assignment, "Tạo bài tập thành công");
  },
  ["admin", "teacher"],
);
