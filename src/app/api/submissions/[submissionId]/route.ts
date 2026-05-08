import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
  canManageClass,
} from "@/lib/apiAuth";
import { getSubmissionById, gradeSubmission } from "@/lib/services/submissions";
import { getAssignmentById } from "@/lib/services/assignments";
import { getClassById } from "@/lib/services/classes";

// GET /api/submissions/[submissionId] - Lấy chi tiết bài nộp
export const GET = withAuth(async (request: NextRequest, { params, user }) => {
  const submissionId = parseInt(params?.submissionId || "0");
  if (!submissionId) return errorResponse("Submission ID không hợp lệ");

  const submission = await getSubmissionById(submissionId);
  if (!submission) return notFoundResponse("Không tìm thấy bài nộp");

  // Check permission
  if (user.role === "student" && submission.userId !== user.id) {
    return errorResponse("Không có quyền xem bài nộp này", 403);
  }

  if (user.role === "teacher") {
    const assignment = await getAssignmentById(submission.assignmentId);
    if (assignment) {
      const cls = await getClassById(assignment.classId);
      if (cls && !canManageClass(user, cls.teacherId)) {
        return errorResponse("Không có quyền xem bài nộp này", 403);
      }
    }
  }

  return successResponse(submission);
}, "authenticated");

// PATCH /api/submissions/[submissionId] - Chấm điểm bài nộp
export const PATCH = withAuth(
  async (request: NextRequest, { params, user }) => {
    const submissionId = parseInt(params?.submissionId || "0");
    if (!submissionId) return errorResponse("Submission ID không hợp lệ");

    const submission = await getSubmissionById(submissionId);
    if (!submission) return notFoundResponse("Không tìm thấy bài nộp");

    // Check permission
    const assignment = await getAssignmentById(submission.assignmentId);
    if (assignment) {
      const cls = await getClassById(assignment.classId);
      if (!cls || !canManageClass(user, cls.teacherId)) {
        return errorResponse("Không có quyền chấm bài nộp này", 403);
      }
    }

    const body = await request.json();
    const {
      score,
      passedTests,
      totalTests,
      executionTime,
      status,
      errorMessage,
    } = body;

    const graded = await gradeSubmission(submissionId, {
      score,
      passedTests,
      totalTests,
      executionTime,
      status,
      errorMessage,
    });

    return successResponse(graded, "Chấm điểm thành công");
  },
  ["admin", "teacher"],
);
