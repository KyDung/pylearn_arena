import pool from "@/lib/db";
import type {
  Assignment,
  AssignmentCreateInput,
  AssignmentStatus,
  PaginatedResponse,
} from "@/types";
import type { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

// ============================================================
// ASSIGNMENT QUERIES
// ============================================================

interface AssignmentRow extends RowDataPacket {
  id: number;
  class_id: number;
  class_name: string | null;
  game_id: number;
  game_title: string | null;
  game_path: string | null;
  title: string;
  description: string | null;
  created_by: number;
  created_by_name: string | null;
  start_time: Date;
  end_time: Date;
  late_submission: boolean;
  late_penalty: number;
  max_attempts: number | null;
  show_ranking: boolean;
  show_answers_after: boolean;
  status: AssignmentStatus;
  submission_count: number;
  passed_count: number;
  created_at: Date;
  updated_at: Date;
}

const mapAssignmentRow = (row: AssignmentRow): Assignment => ({
  id: row.id,
  classId: row.class_id,
  className: row.class_name ?? undefined,
  gameId: row.game_id,
  gameTitle: row.game_title ?? undefined,
  gamePath: row.game_path ?? undefined,
  title: row.title,
  description: row.description ?? undefined,
  createdBy: row.created_by,
  createdByName: row.created_by_name ?? undefined,
  startTime: row.start_time,
  endTime: row.end_time,
  lateSubmission: row.late_submission,
  latePenalty: row.late_penalty,
  maxAttempts: row.max_attempts ?? undefined,
  showRanking: row.show_ranking,
  showAnswersAfter: row.show_answers_after,
  status: row.status,
  submissionCount: row.submission_count ?? 0,
  passedCount: row.passed_count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============================================================
// GET ASSIGNMENT BY ID
// ============================================================

export async function getAssignmentById(
  id: number,
): Promise<Assignment | null> {
  const [rows] = await pool.query<AssignmentRow[]>(
    `SELECT a.*, c.name as class_name, g.title as game_title, g.path as game_path,
            u.full_name as created_by_name,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'passed') as passed_count
     FROM assignments a
     LEFT JOIN classes c ON a.class_id = c.id
     LEFT JOIN games g ON a.game_id = g.id
     LEFT JOIN users u ON a.created_by = u.id
     WHERE a.id = ?`,
    [id],
  );
  return rows.length > 0 ? mapAssignmentRow(rows[0]) : null;
}

// ============================================================
// LIST ASSIGNMENTS WITH FILTERS
// ============================================================

export interface AssignmentFilters {
  classId?: number;
  gameId?: number;
  createdBy?: number;
  status?: AssignmentStatus;
  isActive?: boolean; // currently accepting submissions
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAssignments(
  filters: AssignmentFilters = {},
): Promise<PaginatedResponse<Assignment>> {
  const {
    classId,
    gameId,
    createdBy,
    status,
    isActive,
    search,
    page = 1,
    pageSize = 20,
  } = filters;

  let baseQuery = `
    FROM assignments a
    LEFT JOIN classes c ON a.class_id = c.id
    LEFT JOIN games g ON a.game_id = g.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (classId) {
    baseQuery += " AND a.class_id = ?";
    params.push(classId);
  }

  if (gameId) {
    baseQuery += " AND a.game_id = ?";
    params.push(gameId);
  }

  if (createdBy) {
    baseQuery += " AND a.created_by = ?";
    params.push(createdBy);
  }

  if (status) {
    baseQuery += " AND a.status = ?";
    params.push(status);
  }

  if (isActive !== undefined) {
    if (isActive) {
      baseQuery +=
        " AND a.status = 'published' AND a.start_time <= NOW() AND (a.end_time >= NOW() OR a.late_submission = TRUE)";
    } else {
      baseQuery += " AND (a.status != 'published' OR a.end_time < NOW())";
    }
  }

  if (search) {
    baseQuery += " AND (a.title LIKE ? OR a.description LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  // Count total
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params,
  );
  const total = countRows[0].total;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query<AssignmentRow[]>(
    `SELECT a.*, c.name as class_name, g.title as game_title, g.path as game_path,
            u.full_name as created_by_name,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'passed') as passed_count
     ${baseQuery}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return {
    items: rows.map(mapAssignmentRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET ASSIGNMENTS FOR STUDENT
// ============================================================

export async function getAssignmentsForStudent(
  userId: number,
): Promise<Assignment[]> {
  const [rows] = await pool.query<AssignmentRow[]>(
    `SELECT a.*, c.name as class_name, g.title as game_title, g.path as game_path,
            u.full_name as created_by_name,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'passed') as passed_count
     FROM assignments a
     LEFT JOIN classes c ON a.class_id = c.id
     LEFT JOIN games g ON a.game_id = g.id
     LEFT JOIN users u ON a.created_by = u.id
     INNER JOIN class_members cm ON a.class_id = cm.class_id
     WHERE cm.user_id = ? AND cm.status = 'active'
       AND a.status = 'published'
       AND a.start_time <= NOW()
     ORDER BY a.end_time ASC`,
    [userId],
  );
  return rows.map(mapAssignmentRow);
}

// ============================================================
// CREATE ASSIGNMENT
// ============================================================

export async function createAssignment(
  input: AssignmentCreateInput,
): Promise<Assignment> {
  const {
    classId,
    gameId,
    title,
    description,
    createdBy,
    startTime,
    endTime,
    lateSubmission = false,
    latePenalty = 0,
    maxAttempts,
    showRanking = true,
    showAnswersAfter = false,
  } = input;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO assignments (class_id, game_id, title, description, created_by,
                              start_time, end_time, late_submission, late_penalty,
                              max_attempts, show_ranking, show_answers_after, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      classId,
      gameId,
      title,
      description,
      createdBy,
      startTime,
      endTime,
      lateSubmission,
      latePenalty,
      maxAttempts,
      showRanking,
      showAnswersAfter,
    ],
  );

  const assignment = await getAssignmentById(result.insertId);
  if (!assignment) throw new Error("Failed to create assignment");
  return assignment;
}

// ============================================================
// UPDATE ASSIGNMENT
// ============================================================

export interface AssignmentUpdateInput {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  lateSubmission?: boolean;
  latePenalty?: number;
  maxAttempts?: number | null;
  showRanking?: boolean;
  showAnswersAfter?: boolean;
  status?: AssignmentStatus;
}

export async function updateAssignment(
  id: number,
  input: AssignmentUpdateInput,
): Promise<Assignment | null> {
  const updates: string[] = [];
  const params: (string | number | boolean | Date | null)[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    params.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description);
  }
  if (input.startTime !== undefined) {
    updates.push("start_time = ?");
    params.push(input.startTime);
  }
  if (input.endTime !== undefined) {
    updates.push("end_time = ?");
    params.push(input.endTime);
  }
  if (input.lateSubmission !== undefined) {
    updates.push("late_submission = ?");
    params.push(input.lateSubmission);
  }
  if (input.latePenalty !== undefined) {
    updates.push("late_penalty = ?");
    params.push(input.latePenalty);
  }
  if (input.maxAttempts !== undefined) {
    updates.push("max_attempts = ?");
    params.push(input.maxAttempts);
  }
  if (input.showRanking !== undefined) {
    updates.push("show_ranking = ?");
    params.push(input.showRanking);
  }
  if (input.showAnswersAfter !== undefined) {
    updates.push("show_answers_after = ?");
    params.push(input.showAnswersAfter);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }

  if (updates.length === 0) return getAssignmentById(id);

  params.push(id);
  await pool.query(
    `UPDATE assignments SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  return getAssignmentById(id);
}

// ============================================================
// PUBLISH/CLOSE ASSIGNMENT
// ============================================================

export async function publishAssignment(
  id: number,
): Promise<Assignment | null> {
  return updateAssignment(id, { status: "published" });
}

export async function closeAssignment(id: number): Promise<Assignment | null> {
  return updateAssignment(id, { status: "closed" });
}

// ============================================================
// DELETE ASSIGNMENT
// ============================================================

export async function deleteAssignment(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM assignments WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

// ============================================================
// CHECK IF USER CAN SUBMIT
// ============================================================

export async function canUserSubmit(
  assignmentId: number,
  userId: number,
): Promise<{ canSubmit: boolean; reason?: string; isLate?: boolean }> {
  const assignment = await getAssignmentById(assignmentId);

  if (!assignment) {
    return { canSubmit: false, reason: "Bài tập không tồn tại" };
  }

  if (assignment.status !== "published") {
    return { canSubmit: false, reason: "Bài tập chưa được mở" };
  }

  const now = new Date();

  if (now < assignment.startTime) {
    return { canSubmit: false, reason: "Bài tập chưa bắt đầu" };
  }

  const isLate = now > assignment.endTime;

  if (isLate && !assignment.lateSubmission) {
    return { canSubmit: false, reason: "Đã hết hạn nộp bài" };
  }

  // Check max attempts
  if (assignment.maxAttempts) {
    const [attemptRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM submissions WHERE assignment_id = ? AND user_id = ?",
      [assignmentId, userId],
    );

    if (attemptRows[0].count >= assignment.maxAttempts) {
      return {
        canSubmit: false,
        reason: `Đã hết số lần nộp (${assignment.maxAttempts} lần)`,
      };
    }
  }

  // Check if user is in the class
  const [memberRows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM class_members 
     WHERE class_id = ? AND user_id = ? AND status = 'active'`,
    [assignment.classId, userId],
  );

  if (memberRows.length === 0) {
    return { canSubmit: false, reason: "Bạn không thuộc lớp này" };
  }

  return { canSubmit: true, isLate };
}
