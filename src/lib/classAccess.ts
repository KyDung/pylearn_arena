import pool from "@/lib/db";
import { canManageClass } from "@/lib/apiAuth";
import type { User } from "@/types";

/** Check the requested class itself, not just the caller's teacher role. */
export async function canManageClassById(user: User, classId: number): Promise<boolean> {
  if (!Number.isSafeInteger(classId) || classId <= 0) return false;
  const [rows] = await pool.query<Array<{ teacher_id: number }>>(
    "SELECT teacher_id FROM classes WHERE id = ?",
    [classId],
  );
  return rows.length > 0 && canManageClass(user, rows[0].teacher_id);
}
