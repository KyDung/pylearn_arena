import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getAssignmentById,
  updateAssignment,
  publishAssignment,
  closeAssignment,
  deleteAssignment,
  canUserSubmit,
} from "@/lib/services/assignments";
import { getClassById, getClassMembers } from "@/lib/services/classes";
import { getRankings, getUserRanking } from "@/lib/services/submissions";

// GET /api/assignments/[assignmentId] - Lấy thông tin bài tập
export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  const assignmentId = parseInt(params?.assignmentId || "0");
  if (!assignmentId) return errorResponse("Assignment ID không hợp lệ");

  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) return notFoundResponse("Không tìm thấy bài tập");

  // Check permission
  if (user.role === "student") {
    const canSubmitResult = await canUserSubmit(assignmentId, user.id);
    // Can view if can submit or has submitted before
    if (
      !canSubmitResult.canSubmit &&
      canSubmitResult.reason === "Bạn không thuộc lớp này"
    ) {
      return errorResponse("Không có quyền xem bài tập này", 403);
    }

    // Get user's ranking
    const userRanking = await getUserRanking(assignmentId, user.id);

    // Get rankings if allowed
    let rankings = null;
    if (assignment.showRanking) {
      rankings = await getRankings(assignmentId);
    }

    return successResponse({
      ...assignment,
      userRanking,
      rankings,
      canSubmit: canSubmitResult,
    });
  }

  const cls = await getClassById(assignment.classId);
  if (user.role === "teacher" && cls && !canManageClass(user, cls.teacherId)) {
    return errorResponse("Không có quyền xem bài tập này", 403);
  }

  // Get rankings for teachers/admins
  const rankings = await getRankings(assignmentId);

  return successResponse({ ...assignment, rankings });
}, "authenticated");

// PUT /api/assignments/[assignmentId] - Cập nhật bài tập
export const PUT = withAuth(
  async (request: NextRequest, { params, user }) => {
    const assignmentId = parseInt(params?.assignmentId || "0");
    if (!assignmentId) return errorResponse("Assignment ID không hợp lệ");

    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) return notFoundResponse("Không tìm thấy bài tập");

    const cls = await getClassById(assignment.classId);
    if (!cls || !canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền chỉnh sửa bài tập này", 403);
    }

    const body = await request.json();
    const updated = await updateAssignment(assignmentId, body);

    return successResponse(updated, "Cập nhật thành công");
  },
  ["admin", "teacher"],
);

// DELETE /api/assignments/[assignmentId] - Xóa bài tập
export const DELETE = withAuth(
  async (request: NextRequest, { params, user }) => {
    const assignmentId = parseInt(params?.assignmentId || "0");
    if (!assignmentId) return errorResponse("Assignment ID không hợp lệ");

    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) return notFoundResponse("Không tìm thấy bài tập");

    const cls = await getClassById(assignment.classId);
    if (!cls || !canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền xóa bài tập này", 403);
    }

    await deleteAssignment(assignmentId);
    return successResponse(null, "Đã xóa bài tập");
  },
  ["admin", "teacher"],
);

// PATCH /api/assignments/[assignmentId] - Actions: publish, close
export const PATCH = withAuth(
  async (request: NextRequest, { params, user }) => {
    const assignmentId = parseInt(params?.assignmentId || "0");
    if (!assignmentId) return errorResponse("Assignment ID không hợp lệ");

    const assignment = await getAssignmentById(assignmentId);
    if (!assignment) return notFoundResponse("Không tìm thấy bài tập");

    const cls = await getClassById(assignment.classId);
    if (!cls || !canManageClass(user, cls.teacherId)) {
      return errorResponse("Không có quyền thực hiện", 403);
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "publish":
        const published = await publishAssignment(assignmentId);
        return successResponse(published, "Đã mở bài tập");

      case "close":
        const closed = await closeAssignment(assignmentId);
        return successResponse(closed, "Đã đóng bài tập");

      default:
        return errorResponse("Action không hợp lệ");
    }
  },
  ["admin", "teacher"],
);
