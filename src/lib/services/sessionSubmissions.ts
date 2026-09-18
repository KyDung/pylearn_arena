import pool from "@/lib/db";
import type { ResultSetHeader } from "@/lib/dbTypes";
import { sessionAcceptingSql } from "@/lib/sessionPolicy";

export class SessionSubmissionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SessionSubmissionError";
  }
}

/** The current classroom workflow accepts one final submission per student. */
export async function submitSessionCode(
  sessionId: number,
  userId: number,
  input: unknown,
): Promise<number> {
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    throw new SessionSubmissionError("Invalid session ID", 400);
  }
  if (!input || typeof input !== "object") {
    throw new SessionSubmissionError("Invalid submission", 400);
  }
  const { code, passed_tests, total_tests, score } = input as Record<string, unknown>;
  if (typeof code !== "string" || !code.trim() || code.length > 200_000) {
    throw new SessionSubmissionError("Bài làm phải có nội dung và không vượt quá 200.000 ký tự", 400);
  }
  if (
    typeof passed_tests !== "number" || !Number.isSafeInteger(passed_tests) || passed_tests < 0 ||
    typeof total_tests !== "number" || !Number.isSafeInteger(total_tests) || total_tests <= 0 ||
    passed_tests > total_tests ||
    typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100
  ) {
    throw new SessionSubmissionError("Kết quả test hoặc điểm không hợp lệ", 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize submissions with each other and with the teacher's close operation.
    const [sessions] = await connection.query<Array<{ class_id: number }>>(
      "SELECT class_id FROM sessions WHERE id = ? FOR UPDATE",
      [sessionId],
    );
    if (!sessions.length) throw new SessionSubmissionError("Session not found", 404);

    const [members] = await connection.query<Array<{ id: number }>>(
      "SELECT id FROM class_members WHERE class_id = ? AND user_id = ? AND status = 'active'",
      [sessions[0].class_id, userId],
    );
    if (!members.length) {
      throw new SessionSubmissionError("Bạn không thuộc lớp này", 403);
    }

    // Check wall-clock time after acquiring the lock, including time spent waiting.
    const [openSessions] = await connection.query<Array<{ id: number }>>(
      `SELECT s.id FROM sessions s WHERE s.id = ? AND ${sessionAcceptingSql("s")}`,
      [sessionId],
    );
    if (!openSessions.length) {
      throw new SessionSubmissionError("Phiên đã hết giờ hoặc không còn nhận bài nộp", 403);
    }

    const [existing] = await connection.query<Array<{ id: number }>>(
      "SELECT id FROM session_submissions WHERE session_id = ? AND user_id = ? LIMIT 1",
      [sessionId, userId],
    );
    if (existing.length) {
      throw new SessionSubmissionError("Bạn đã nộp bài cho session này rồi", 409);
    }

    // Client scores are still practice results; this is not server-side grading.
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO session_submissions
       (session_id, user_id, code, score, passed_tests, total_tests, is_correct, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, clock_timestamp())`,
      [sessionId, userId, code, score, passed_tests, total_tests, passed_tests === total_tests],
    );
    await connection.query(
      `UPDATE sessions SET
         total_submissions = (SELECT COUNT(*) FROM session_submissions WHERE session_id = ?),
         unique_submitters = (SELECT COUNT(DISTINCT user_id) FROM session_submissions WHERE session_id = ?)
       WHERE id = ?`,
      [sessionId, sessionId, sessionId],
    );
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    if (
      error && typeof error === "object" && "code" in error && error.code === "23505" &&
      "constraint" in error && error.constraint === "session_submissions_session_user_key"
    ) {
      throw new SessionSubmissionError("Bạn đã nộp bài cho session này rồi", 409);
    }
    throw error;
  } finally {
    connection.release();
  }
}
