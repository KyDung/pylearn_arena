import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  submitSessionCode,
  SessionSubmissionError,
} from "@/lib/services/sessionSubmissions";

// POST /api/student/sessions/[id]/submit - One final submission per student.
export const POST = withAuth(async (request: NextRequest, { params, user }) => {
  try {
    const submissionId = await submitSessionCode(
      Number(params?.id),
      user.id,
      await request.json(),
    );
    return successResponse({ submissionId }, "Code submitted successfully!");
  } catch (error) {
    if (error instanceof SessionSubmissionError) {
      return errorResponse(error.message, error.status);
    }
    if (error instanceof SyntaxError) {
      return errorResponse("Invalid JSON", 400);
    }
    throw error;
  }
}, ["student"]);
