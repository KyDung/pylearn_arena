import pool from "@/lib/db";
import type {
  Submission,
  SubmissionCreateInput,
  SubmissionGradeInput,
  SubmissionStatus,
  Ranking,
  PaginatedResponse,
} from "@/types";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { canUserSubmit, getAssignmentById } from "./assignments";

// ============================================================
// SUBMISSION QUERIES
// ============================================================

interface SubmissionRow extends RowDataPacket {
  id: number;
  assignment_id: number;
  assignment_title: string | null;
  user_id: number;
  username: string | null;
  full_name: string | null;
  code: string;
  score: number | null;
  passed_tests: number;
  total_tests: number;
  execution_time: number | null;
  status: SubmissionStatus;
  error_message: string | null;
  is_late: boolean;
  attempt_number: number;
  ip_address: string | null;
  user_agent: string | null;
  submitted_at: Date;
  graded_at: Date | null;
}

const mapSubmissionRow = (row: SubmissionRow): Submission => ({
  id: row.id,
  assignmentId: row.assignment_id,
  assignmentTitle: row.assignment_title ?? undefined,
  userId: row.user_id,
  username: row.username ?? undefined,
  fullName: row.full_name ?? undefined,
  code: row.code,
  score: row.score ?? undefined,
  passedTests: row.passed_tests,
  totalTests: row.total_tests,
  executionTime: row.execution_time ?? undefined,
  status: row.status,
  errorMessage: row.error_message ?? undefined,
  isLate: row.is_late,
  attemptNumber: row.attempt_number,
  ipAddress: row.ip_address ?? undefined,
  userAgent: row.user_agent ?? undefined,
  submittedAt: row.submitted_at,
  gradedAt: row.graded_at ?? undefined,
});

// ============================================================
// GET SUBMISSION BY ID
// ============================================================

export async function getSubmissionById(
  id: number,
): Promise<Submission | null> {
  const [rows] = await pool.query<SubmissionRow[]>(
    `SELECT s.*, a.title as assignment_title, u.username, u.full_name
     FROM submissions s
     LEFT JOIN assignments a ON s.assignment_id = a.id
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.id = ?`,
    [id],
  );
  return rows.length > 0 ? mapSubmissionRow(rows[0]) : null;
}

// ============================================================
// LIST SUBMISSIONS WITH FILTERS
// ============================================================

export interface SubmissionFilters {
  assignmentId?: number;
  userId?: number;
  classId?: number;
  status?: SubmissionStatus;
  isLate?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getSubmissions(
  filters: SubmissionFilters = {},
): Promise<PaginatedResponse<Submission>> {
  const {
    assignmentId,
    userId,
    classId,
    status,
    isLate,
    page = 1,
    pageSize = 20,
  } = filters;

  let baseQuery = `
    FROM submissions s
    LEFT JOIN assignments a ON s.assignment_id = a.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const params: (string | number | boolean)[] = [];

  if (assignmentId) {
    baseQuery += " AND s.assignment_id = ?";
    params.push(assignmentId);
  }

  if (userId) {
    baseQuery += " AND s.user_id = ?";
    params.push(userId);
  }

  if (classId) {
    baseQuery += " AND a.class_id = ?";
    params.push(classId);
  }

  if (status) {
    baseQuery += " AND s.status = ?";
    params.push(status);
  }

  if (isLate !== undefined) {
    baseQuery += " AND s.is_late = ?";
    params.push(isLate);
  }

  // Count total
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params,
  );
  const total = countRows[0].total;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query<SubmissionRow[]>(
    `SELECT s.*, a.title as assignment_title, u.username, u.full_name
     ${baseQuery}
     ORDER BY s.submitted_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return {
    items: rows.map(mapSubmissionRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET USER'S SUBMISSIONS FOR ASSIGNMENT
// ============================================================

export async function getUserSubmissionsForAssignment(
  assignmentId: number,
  userId: number,
): Promise<Submission[]> {
  const [rows] = await pool.query<SubmissionRow[]>(
    `SELECT s.*, a.title as assignment_title, u.username, u.full_name
     FROM submissions s
     LEFT JOIN assignments a ON s.assignment_id = a.id
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.assignment_id = ? AND s.user_id = ?
     ORDER BY s.submitted_at DESC`,
    [assignmentId, userId],
  );
  return rows.map(mapSubmissionRow);
}

// ============================================================
// CREATE SUBMISSION
// ============================================================

export async function createSubmission(
  input: SubmissionCreateInput,
): Promise<{ success: boolean; submission?: Submission; error?: string }> {
  const { assignmentId, userId, code, ipAddress, userAgent } = input;

  // Check if user can submit
  const canSubmitResult = await canUserSubmit(assignmentId, userId);
  if (!canSubmitResult.canSubmit) {
    return { success: false, error: canSubmitResult.reason };
  }

  // Get attempt number
  const [attemptRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM submissions WHERE assignment_id = ? AND user_id = ?",
    [assignmentId, userId],
  );
  const attemptNumber = attemptRows[0].count + 1;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO submissions (assignment_id, user_id, code, status, is_late, attempt_number, ip_address, user_agent)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      assignmentId,
      userId,
      code,
      canSubmitResult.isLate || false,
      attemptNumber,
      ipAddress,
      userAgent,
    ],
  );

  const submission = await getSubmissionById(result.insertId);
  if (!submission) {
    return { success: false, error: "Failed to create submission" };
  }

  return { success: true, submission };
}

// ============================================================
// GRADE SUBMISSION
// ============================================================

export async function gradeSubmission(
  id: number,
  input: SubmissionGradeInput,
): Promise<Submission | null> {
  const {
    score,
    passedTests,
    totalTests,
    executionTime,
    status,
    errorMessage,
  } = input;

  // Get submission to check if late and apply penalty
  const submission = await getSubmissionById(id);
  if (!submission) return null;

  let finalScore = score;

  // Apply late penalty if applicable
  if (submission.isLate && finalScore > 0) {
    const assignment = await getAssignmentById(submission.assignmentId);
    if (assignment && assignment.latePenalty > 0) {
      finalScore = Math.max(
        0,
        finalScore - (finalScore * assignment.latePenalty) / 100,
      );
    }
  }

  await pool.query(
    `UPDATE submissions 
     SET score = ?, passed_tests = ?, total_tests = ?, execution_time = ?,
         status = ?, error_message = ?, graded_at = NOW()
     WHERE id = ?`,
    [
      finalScore,
      passedTests,
      totalTests,
      executionTime,
      status,
      errorMessage,
      id,
    ],
  );

  // Update ranking
  await updateRanking(id);

  return getSubmissionById(id);
}

// ============================================================
// RANKING QUERIES
// ============================================================

interface RankingRow extends RowDataPacket {
  id: number;
  assignment_id: number;
  user_id: number;
  username: string | null;
  full_name: string | null;
  best_score: number;
  best_submission_id: number | null;
  total_attempts: number;
  first_passed_at: Date | null;
  rank_position: number | null;
  updated_at: Date;
}

const mapRankingRow = (row: RankingRow): Ranking => ({
  id: row.id,
  assignmentId: row.assignment_id,
  userId: row.user_id,
  username: row.username ?? undefined,
  fullName: row.full_name ?? undefined,
  bestScore: row.best_score,
  bestSubmissionId: row.best_submission_id ?? undefined,
  totalAttempts: row.total_attempts,
  firstPassedAt: row.first_passed_at ?? undefined,
  rankPosition: row.rank_position ?? undefined,
  updatedAt: row.updated_at,
});

export async function getRankings(assignmentId: number): Promise<Ranking[]> {
  const [rows] = await pool.query<RankingRow[]>(
    `SELECT r.*, u.username, u.full_name
     FROM rankings r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.assignment_id = ?
     ORDER BY r.rank_position ASC`,
    [assignmentId],
  );
  return rows.map(mapRankingRow);
}

export async function getUserRanking(
  assignmentId: number,
  userId: number,
): Promise<Ranking | null> {
  const [rows] = await pool.query<RankingRow[]>(
    `SELECT r.*, u.username, u.full_name
     FROM rankings r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.assignment_id = ? AND r.user_id = ?`,
    [assignmentId, userId],
  );
  return rows.length > 0 ? mapRankingRow(rows[0]) : null;
}

// ============================================================
// UPDATE RANKING AFTER SUBMISSION
// ============================================================

async function updateRanking(submissionId: number): Promise<void> {
  const submission = await getSubmissionById(submissionId);
  if (!submission || submission.score === undefined) return;

  const { assignmentId, userId, score } = submission;

  // Check if ranking exists
  const [existingRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, best_score FROM rankings WHERE assignment_id = ? AND user_id = ?",
    [assignmentId, userId],
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];

    // Only update if new score is better
    if (score > existing.best_score) {
      await pool.query(
        `UPDATE rankings 
         SET best_score = ?, best_submission_id = ?, total_attempts = total_attempts + 1,
             first_passed_at = IF(first_passed_at IS NULL AND ? >= 100, NOW(), first_passed_at)
         WHERE assignment_id = ? AND user_id = ?`,
        [score, submissionId, score, assignmentId, userId],
      );
    } else {
      await pool.query(
        "UPDATE rankings SET total_attempts = total_attempts + 1 WHERE assignment_id = ? AND user_id = ?",
        [assignmentId, userId],
      );
    }
  } else {
    // Create new ranking
    await pool.query(
      `INSERT INTO rankings (assignment_id, user_id, best_score, best_submission_id, total_attempts, first_passed_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [
        assignmentId,
        userId,
        score,
        submissionId,
        score >= 100 ? new Date() : null,
      ],
    );
  }

  // Recalculate rank positions for this assignment
  await recalculateRankPositions(assignmentId);
}

async function recalculateRankPositions(assignmentId: number): Promise<void> {
  // Get all rankings for this assignment ordered by score and time
  const [rankings] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM rankings 
     WHERE assignment_id = ?
     ORDER BY best_score DESC, first_passed_at ASC, updated_at ASC`,
    [assignmentId],
  );

  // Update positions
  for (let i = 0; i < rankings.length; i++) {
    await pool.query("UPDATE rankings SET rank_position = ? WHERE id = ?", [
      i + 1,
      rankings[i].id,
    ]);
  }
}

// ============================================================
// GET STUDENT'S OVERALL STATS
// ============================================================

export async function getStudentStats(userId: number): Promise<{
  totalSubmissions: number;
  passedAssignments: number;
  averageScore: number;
  totalAttempts: number;
}> {
  const [submissionStats] = await pool.query<RowDataPacket[]>(
    `SELECT 
       COUNT(*) as total_submissions,
       COUNT(DISTINCT CASE WHEN status = 'passed' THEN assignment_id END) as passed_assignments,
       AVG(score) as average_score
     FROM submissions
     WHERE user_id = ?`,
    [userId],
  );

  const [attemptStats] = await pool.query<RowDataPacket[]>(
    "SELECT SUM(total_attempts) as total_attempts FROM rankings WHERE user_id = ?",
    [userId],
  );

  return {
    totalSubmissions: submissionStats[0].total_submissions || 0,
    passedAssignments: submissionStats[0].passed_assignments || 0,
    averageScore: Math.round(submissionStats[0].average_score || 0),
    totalAttempts: attemptStats[0].total_attempts || 0,
  };
}
