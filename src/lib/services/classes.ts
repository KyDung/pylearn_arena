import pool from "@/lib/db";
import type {
  Class,
  ClassCreateInput,
  ClassMember,
  ClassMemberRole,
  ClassMemberStatus,
  ClassStatus,
  PaginatedResponse,
} from "@/types";
import type { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";
import { nanoid } from "nanoid";

// ============================================================
// CLASS QUERIES
// ============================================================

interface ClassRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  code: string;
  teacher_id: number;
  teacher_name: string | null;
  school_year: string | null;
  grade: string | null;
  max_students: number;
  status: ClassStatus;
  student_count: number;
  course_count: number;
  assignment_count: number;
  created_at: Date;
  updated_at: Date;
}

const mapClassRow = (row: ClassRow): Class => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  code: row.code,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name ?? undefined,
  schoolYear: row.school_year ?? undefined,
  grade: row.grade ?? undefined,
  maxStudents: row.max_students,
  status: row.status,
  studentCount: row.student_count ?? 0,
  courseCount: row.course_count ?? 0,
  assignmentCount: row.assignment_count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============================================================
// GET CLASS BY ID/CODE
// ============================================================

export async function getClassById(id: number): Promise<Class | null> {
  const [rows] = await pool.query<ClassRow[]>(
    `SELECT c.*, u.full_name as teacher_name,
            (SELECT COUNT(*) FROM class_members cm WHERE cm.class_id = c.id AND cm.status = 'active') as student_count,
            (SELECT COUNT(*) FROM course_access ca WHERE ca.class_id = c.id) as course_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status = 'published') as assignment_count
     FROM classes c
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.id = ?`,
    [id],
  );
  return rows.length > 0 ? mapClassRow(rows[0]) : null;
}

export async function getClassByCode(code: string): Promise<Class | null> {
  const [rows] = await pool.query<ClassRow[]>(
    `SELECT c.*, u.full_name as teacher_name,
            (SELECT COUNT(*) FROM class_members cm WHERE cm.class_id = c.id AND cm.status = 'active') as student_count,
            (SELECT COUNT(*) FROM course_access ca WHERE ca.class_id = c.id) as course_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status = 'published') as assignment_count
     FROM classes c
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.code = ?`,
    [code],
  );
  return rows.length > 0 ? mapClassRow(rows[0]) : null;
}

// ============================================================
// LIST CLASSES WITH FILTERS
// ============================================================

export interface ClassFilters {
  teacherId?: number;
  status?: ClassStatus;
  schoolYear?: string;
  grade?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getClasses(
  filters: ClassFilters = {},
): Promise<PaginatedResponse<Class>> {
  const {
    teacherId,
    status,
    schoolYear,
    grade,
    search,
    page = 1,
    pageSize = 20,
  } = filters;

  let baseQuery = `
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (teacherId) {
    baseQuery += " AND c.teacher_id = ?";
    params.push(teacherId);
  }

  if (status) {
    baseQuery += " AND c.status = ?";
    params.push(status);
  }

  if (schoolYear) {
    baseQuery += " AND c.school_year = ?";
    params.push(schoolYear);
  }

  if (grade) {
    baseQuery += " AND c.grade = ?";
    params.push(grade);
  }

  if (search) {
    baseQuery += " AND (c.name LIKE ? OR c.code LIKE ?)";
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
  const [rows] = await pool.query<ClassRow[]>(
    `SELECT c.*, u.full_name as teacher_name,
            (SELECT COUNT(*) FROM class_members cm WHERE cm.class_id = c.id AND cm.status = 'active') as student_count,
            (SELECT COUNT(*) FROM course_access ca WHERE ca.class_id = c.id) as course_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status = 'published') as assignment_count
     ${baseQuery}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  return {
    items: rows.map(mapClassRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET CLASSES BY STUDENT
// ============================================================

export async function getClassesByStudent(userId: number): Promise<Class[]> {
  const [rows] = await pool.query<ClassRow[]>(
    `SELECT c.*, u.full_name as teacher_name,
            (SELECT COUNT(*) FROM class_members cm WHERE cm.class_id = c.id AND cm.status = 'active') as student_count,
            (SELECT COUNT(*) FROM course_access ca WHERE ca.class_id = c.id) as course_count,
            (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status = 'published') as assignment_count
     FROM classes c
     LEFT JOIN users u ON c.teacher_id = u.id
     INNER JOIN class_members cm ON c.id = cm.class_id
     WHERE cm.user_id = ? AND cm.status = 'active' AND c.status = 'active'
     ORDER BY c.name`,
    [userId],
  );
  return rows.map(mapClassRow);
}

// ============================================================
// CREATE CLASS
// ============================================================

function generateClassCode(): string {
  return nanoid(8).toUpperCase();
}

export async function createClass(input: ClassCreateInput): Promise<Class> {
  const {
    name,
    description,
    teacherId,
    schoolYear,
    grade,
    maxStudents = 50,
  } = input;

  // Generate unique class code
  let code = generateClassCode();
  let attempts = 0;
  while ((await getClassByCode(code)) && attempts < 10) {
    code = generateClassCode();
    attempts++;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO classes (name, description, code, teacher_id, school_year, grade, max_students, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [name, description, code, teacherId, schoolYear, grade, maxStudents],
  );

  const cls = await getClassById(result.insertId);
  if (!cls) throw new Error("Failed to create class");
  return cls;
}

// ============================================================
// UPDATE CLASS
// ============================================================

export interface ClassUpdateInput {
  name?: string;
  description?: string;
  schoolYear?: string;
  grade?: string;
  maxStudents?: number;
  status?: ClassStatus;
}

export async function updateClass(
  id: number,
  input: ClassUpdateInput,
): Promise<Class | null> {
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description);
  }
  if (input.schoolYear !== undefined) {
    updates.push("school_year = ?");
    params.push(input.schoolYear);
  }
  if (input.grade !== undefined) {
    updates.push("grade = ?");
    params.push(input.grade);
  }
  if (input.maxStudents !== undefined) {
    updates.push("max_students = ?");
    params.push(input.maxStudents);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }

  if (updates.length === 0) return getClassById(id);

  params.push(id);
  await pool.query(
    `UPDATE classes SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  return getClassById(id);
}

export async function hardDeleteClass(id: number): Promise<boolean> {
  // Hard delete - permanently remove class and all related data
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete related data - only tables that definitely exist
    // Many tables have ON DELETE CASCADE so they'll auto-delete

    const tablesToClean = [
      { query: "DELETE FROM class_members WHERE class_id = ?", params: [id] },
      { query: "DELETE FROM class_course_settings WHERE class_id = ?", params: [id] },
      { query: "DELETE FROM course_access WHERE class_id = ?", params: [id] },
      { query: "DELETE FROM course_content_access WHERE class_id = ?", params: [id] },
      { query: "DELETE FROM assignments WHERE class_id = ?", params: [id] },
      { query: "DELETE FROM sessions WHERE class_id = ?", params: [id] },
      {
        query: "UPDATE contests SET class_id = NULL WHERE class_id = ?",
        params: [id],
      },
    ];

    for (const { query, params } of tablesToClean) {
      try {
        await connection.query(query, params);
      } catch (err: any) {
        // Ignore "table doesn't exist" errors
        if (!err.message?.includes("doesn't exist")) {
          console.warn(`Warning cleaning class data:`, err.message);
        }
      }
    }

    // Delete the class
    const [result] = await connection.query<ResultSetHeader>(
      "DELETE FROM classes WHERE id = ?",
      [id],
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================================
// CLASS MEMBERS
// ============================================================

interface ClassMemberRow extends RowDataPacket {
  id: number;
  class_id: number;
  user_id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  status: ClassMemberStatus;
  joined_at: Date;
}

const mapClassMemberRow = (row: ClassMemberRow): ClassMember => ({
  id: row.id,
  classId: row.class_id,
  userId: row.user_id,
  username: row.username,
  fullName: row.full_name ?? undefined,
  email: row.email ?? undefined,
  role: "student", // Always student since table doesn't have role column
  status: row.status,
  joinedAt: row.joined_at,
});

export async function getClassMembers(
  classId: number,
  status: ClassMemberStatus = "active",
): Promise<ClassMember[]> {
  const [rows] = await pool.query<ClassMemberRow[]>(
    `SELECT cm.*, u.username, u.full_name, u.email
     FROM class_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.class_id = ? AND cm.status = ?
     ORDER BY u.full_name, u.username`,
    [classId, status],
  );
  return rows.map(mapClassMemberRow);
}

export async function addClassMember(
  classId: number,
  userId: number,
  role: ClassMemberRole = "student",
): Promise<ClassMember | null> {
  // Check if already a member
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM class_members WHERE class_id = ? AND user_id = ?",
    [classId, userId],
  );

  if (existing.length > 0) {
    // Reactivate if removed
    await pool.query(
      "UPDATE class_members SET status = 'active' WHERE class_id = ? AND user_id = ?",
      [classId, userId],
    );
  } else {
    await pool.query<ResultSetHeader>(
      "INSERT INTO class_members (class_id, user_id, status) VALUES (?, ?, 'active')",
      [classId, userId],
    );
  }

  const [rows] = await pool.query<ClassMemberRow[]>(
    `SELECT cm.*, u.username, u.full_name, u.email
     FROM class_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.class_id = ? AND cm.user_id = ?`,
    [classId, userId],
  );

  return rows.length > 0 ? mapClassMemberRow(rows[0]) : null;
}

export async function removeClassMember(
  classId: number,
  userId: number,
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE class_members SET status = 'removed' WHERE class_id = ? AND user_id = ?",
    [classId, userId],
  );
  return result.affectedRows > 0;
}

export async function bulkAddClassMembers(
  classId: number,
  userIds: number[],
  role: ClassMemberRole = "student",
): Promise<{ added: number; errors: number }> {
  let added = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      await addClassMember(classId, userId, role);
      added++;
    } catch {
      errors++;
    }
  }

  return { added, errors };
}

// ============================================================
// JOIN CLASS BY CODE
// ============================================================

export async function joinClassByCode(
  code: string,
  userId: number,
): Promise<{ success: boolean; class?: Class; error?: string }> {
  const cls = await getClassByCode(code);

  if (!cls) {
    return { success: false, error: "Mã lớp không tồn tại" };
  }

  if (cls.status !== "active") {
    return { success: false, error: "Lớp học đã đóng" };
  }

  // Check if class is full
  if (cls.studentCount && cls.studentCount >= cls.maxStudents) {
    return { success: false, error: "Lớp học đã đầy" };
  }

  await addClassMember(cls.id, userId, "student");

  return { success: true, class: cls };
}
