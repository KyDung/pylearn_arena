/**
 * Course Access Service
 * Quản lý quyền truy cập khóa học cho lớp học
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// ============================================================
// INTERFACES
// ============================================================

export interface ClassCourseSettings {
  id: number;
  class_id: number;
  course_id: number;
  created_by: number;
  created_at: Date;
}

export interface CourseContentAccess {
  id: number;
  class_id: number;
  course_id: number;
  content_type: "topic" | "lesson";
  content_id: string;
  is_unlocked: boolean;
  unlocked_by: number | null;
  unlocked_at: Date | null;
}

// ============================================================
// ADD COURSE TO CLASS
// ============================================================

export async function addCourseToClass(
  classId: number,
  courseId: number,
  teacherId: number,
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO class_course_settings (class_id, course_id, created_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [classId, courseId, teacherId],
  );
  return result.insertId;
}

// ============================================================
// REMOVE COURSE FROM CLASS
// ============================================================

export async function removeCourseFromClass(
  classId: number,
  courseId: number,
): Promise<void> {
  await pool.query(
    "DELETE FROM class_course_settings WHERE class_id = ? AND course_id = ?",
    [classId, courseId],
  );
  // Content access records will be auto-deleted by cascade
}

// ============================================================
// GET COURSES FOR CLASS
// ============================================================

export async function getClassCourses(classId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ccs.*, c.title, c.description, c.slug
     FROM class_course_settings ccs
     JOIN courses c ON ccs.course_id = c.id
     WHERE ccs.class_id = ?
     ORDER BY ccs.created_at DESC`,
    [classId],
  );
  return rows;
}

// ============================================================
// UNLOCK CONTENT (Single)
// ============================================================

export async function unlockContent(
  classId: number,
  courseId: number,
  contentType: "topic" | "lesson",
  contentId: string,
  teacherId: number,
): Promise<void> {
  console.log("🔓 unlockContent called with:", {
    classId,
    courseId,
    contentType,
    contentId,
    teacherId,
  });

  // Tự động grant course cho class nếu chưa có
  const [result] = await pool.query(
    `INSERT INTO course_access (class_id, course_id, granted_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE class_id = class_id`,
    [classId, courseId],
  );
  console.log("✅ course_access created/updated:", result);

  // Unlock content
  await pool.query(
    `INSERT INTO course_content_access 
     (class_id, course_id, content_type, content_id, is_unlocked, unlocked_by, unlocked_at)
     VALUES (?, ?, ?, ?, TRUE, ?, NOW())
     ON DUPLICATE KEY UPDATE 
       is_unlocked = TRUE, 
       unlocked_by = ?, 
       unlocked_at = NOW()`,
    [classId, courseId, contentType, contentId, teacherId, teacherId],
  );
  console.log("✅ content unlocked successfully");
}

// ============================================================
// LOCK CONTENT (Single)
// ============================================================

export async function lockContent(
  classId: number,
  courseId: number,
  contentType: "topic" | "lesson",
  contentId: string,
): Promise<void> {
  console.log("🔒 lockContent called with:", {
    classId,
    courseId,
    contentType,
    contentId,
  });

  // Lock content
  await pool.query(
    `UPDATE course_content_access 
     SET is_unlocked = FALSE, unlocked_by = NULL, unlocked_at = NULL
     WHERE class_id = ? AND course_id = ? AND content_type = ? AND content_id = ?`,
    [classId, courseId, contentType, contentId],
  );

  // Kiểm tra xem còn content nào unlocked không
  const [remaining] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count 
     FROM course_content_access 
     WHERE class_id = ? AND course_id = ? AND is_unlocked = TRUE`,
    [classId, courseId],
  );

  console.log("📊 Remaining unlocked content:", remaining[0].count);

  // Nếu không còn content nào unlocked, xóa course_access
  if (remaining[0].count === 0) {
    await pool.query(
      `DELETE FROM course_access WHERE class_id = ? AND course_id = ?`,
      [classId, courseId],
    );
    console.log("🗑️ Removed course_access - no unlocked content left");
  }
}

// ============================================================
// BULK UNLOCK
// ============================================================

export async function bulkUnlockContent(
  classId: number,
  courseId: number,
  contentType: "topic" | "lesson",
  contentIds: string[],
  teacherId: number,
): Promise<number> {
  if (contentIds.length === 0) return 0;

  const values = contentIds.map((id) => [
    classId,
    courseId,
    contentType,
    id,
    teacherId,
    teacherId,
  ]);

  const placeholders = contentIds
    .map(() => "(?, ?, ?, ?, TRUE, ?, NOW())")
    .join(", ");

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO course_content_access 
     (class_id, course_id, content_type, content_id, is_unlocked, unlocked_by, unlocked_at)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE 
       is_unlocked = TRUE, 
       unlocked_by = VALUES(unlocked_by), 
       unlocked_at = NOW()`,
    values.flat(),
  );

  return result.affectedRows;
}

// ============================================================
// BULK LOCK
// ============================================================

export async function bulkLockContent(
  classId: number,
  courseId: number,
  contentType: "topic" | "lesson",
  contentIds: string[],
): Promise<number> {
  if (contentIds.length === 0) return 0;

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE course_content_access 
     SET is_unlocked = FALSE, unlocked_by = NULL, unlocked_at = NULL
     WHERE class_id = ? AND course_id = ? AND content_type = ? AND content_id IN (?)`,
    [classId, courseId, contentType, contentIds],
  );

  return result.affectedRows;
}

// ============================================================
// GET ACCESS STATUS FOR CLASS
// ============================================================

export async function getClassCourseAccess(
  classId: number,
  courseId: number,
): Promise<CourseContentAccess[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM course_content_access 
     WHERE class_id = ? AND course_id = ?
     ORDER BY content_type, content_id`,
    [classId, courseId],
  );
  return rows as CourseContentAccess[];
}

// ============================================================
// CHECK IF STUDENT CAN ACCESS CONTENT
// ============================================================

export async function checkStudentAccess(
  studentId: number,
  courseId: number,
  contentType: "topic" | "lesson",
  contentId: string,
): Promise<boolean> {
  // Get all classes student belongs to
  const [classRows] = await pool.query<RowDataPacket[]>(
    `SELECT class_id FROM class_members 
     WHERE student_id = ? AND status = 'active'`,
    [studentId],
  );

  if (classRows.length === 0) return false;

  const classIds = classRows.map((r) => r.class_id);

  // Check if any of student's classes has this content unlocked
  const [accessRows] = await pool.query<RowDataPacket[]>(
    `SELECT is_unlocked FROM course_content_access 
     WHERE class_id IN (?) 
       AND course_id = ? 
       AND content_type = ? 
       AND content_id = ?
       AND is_unlocked = TRUE
     LIMIT 1`,
    [classIds, courseId, contentType, contentId],
  );

  return accessRows.length > 0;
}

// ============================================================
// GET ALL UNLOCKED CONTENT FOR STUDENT
// ============================================================

export async function getStudentUnlockedContent(
  studentId: number,
  courseId: number,
): Promise<{
  topics: string[];
  lessons: string[];
}> {
  // Get all classes student belongs to
  const [classRows] = await pool.query<RowDataPacket[]>(
    `SELECT class_id FROM class_members 
     WHERE student_id = ? AND status = 'active'`,
    [studentId],
  );

  if (classRows.length === 0) {
    return { topics: [], lessons: [] };
  }

  const classIds = classRows.map((r) => r.class_id);

  // Get all unlocked content for these classes
  const [contentRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT content_type, content_id 
     FROM course_content_access 
     WHERE class_id IN (?) 
       AND course_id = ? 
       AND is_unlocked = TRUE`,
    [classIds, courseId],
  );

  const topics: string[] = [];
  const lessons: string[] = [];

  contentRows.forEach((row) => {
    if (row.content_type === "topic") {
      topics.push(row.content_id);
    } else if (row.content_type === "lesson") {
      lessons.push(row.content_id);
    }
  });

  return { topics, lessons };
}
