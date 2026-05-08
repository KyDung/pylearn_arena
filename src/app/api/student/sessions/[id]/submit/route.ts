import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import SessionService from "@/lib/services/sessions";
import pool from "@/lib/db";
import { ResultSetHeader } from "mysql2";

// POST /api/student/sessions/[id]/submit - Nộp bài
export const POST = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const id = context.params?.id;
      const sessionId = id ? parseInt(id) : 0;
      const { user } = context;

      if (!sessionId) {
        return errorResponse("Invalid session ID", 400);
      }

      const body = await request.json();
      const { code, passed_tests, total_tests, score } = body;

      if (!code || typeof code !== "string") {
        return errorResponse("Code is required", 400);
      }

      if (typeof passed_tests !== "number" || typeof total_tests !== "number") {
        return errorResponse("Test results are required", 400);
      }

      // Check if session is active
      const isActive = await SessionService.isSessionActive(sessionId);
      if (!isActive) {
        return errorResponse(
          "This session is no longer accepting submissions",
          403,
        );
      }

      // Check if student is member of the class
      const session = await SessionService.getSessionById(sessionId);
      if (!session) {
        return errorResponse("Session not found", 404);
      }

      const [memberRows]: any = await pool.query(
        "SELECT id FROM class_members WHERE class_id = ? AND user_id = ? AND status = 'active'",
        [session.class_id, user.id],
      );

      if (memberRows.length === 0) {
        return errorResponse("You are not a member of this class", 403);
      }

      // Check if user already submitted - if yes, update, if no, insert
      const [existingRows]: any = await pool.query(
        "SELECT id, attempt_number FROM session_submissions WHERE session_id = ? AND user_id = ?",
        [sessionId, user.id],
      );

      // Check max_submissions limit
      if (
        typeof session.max_submissions === "number" &&
        session.max_submissions > 0
      ) {
        const currentAttempts =
          existingRows.length > 0 ? existingRows[0].attempt_number : 0;
        if (currentAttempts >= session.max_submissions) {
          return errorResponse(
            `You have reached the maximum number of submissions (${session.max_submissions})`,
            403,
          );
        }
      }

      let submissionId: number;

      if (existingRows.length > 0) {
        // Update existing submission
        await pool.query(
          `UPDATE session_submissions 
           SET code = ?, score = ?, passed_tests = ?, total_tests = ?, 
               is_correct = ?, submitted_at = CURRENT_TIMESTAMP, attempt_number = attempt_number + 1
           WHERE session_id = ? AND user_id = ?`,
          [
            code,
            score || 0,
            passed_tests,
            total_tests,
            passed_tests === total_tests,
            sessionId,
            user.id,
          ],
        );
        submissionId = existingRows[0].id;
      } else {
        // Insert new submission
        const [result] = await pool.query<ResultSetHeader>(
          `INSERT INTO session_submissions (session_id, user_id, code, score, passed_tests, total_tests, is_correct, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            sessionId,
            user.id,
            code,
            score || 0,
            passed_tests,
            total_tests,
            passed_tests === total_tests,
          ],
        );
        submissionId = result.insertId;
      }

      // Update session stats
      await SessionService.updateSessionStats(sessionId);

      return successResponse({ submissionId }, "Code submitted successfully!");
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
