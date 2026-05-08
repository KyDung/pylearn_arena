import pool from "@/lib/db";
import type {
  User,
  UserCreateInput,
  UserUpdateInput,
  UserRole,
  UserStatus,
  PaginatedResponse,
} from "@/types";
import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

// ============================================================
// USER QUERIES
// ============================================================

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  username: row.username,
  fullName: row.full_name ?? undefined,
  email: row.email ?? undefined,
  role: row.role,
  status: "active", // Default since column doesn't exist
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ============================================================
// GET USER BY ID/USERNAME
// ============================================================

export async function getUserById(id: number): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? mapUserRow(rows[0]) : null;
}

export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE username = ?",
    [username],
  );
  return rows.length > 0 ? mapUserRow(rows[0]) : null;
}

export async function getUserWithPassword(
  username: string,
): Promise<(User & { password: string }) | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE username = ?",
    [username],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...mapUserRow(row),
    password: row.password,
  };
}

// ============================================================
// LIST USERS WITH FILTERS
// ============================================================

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  createdBy?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getUsers(
  filters: UserFilters = {},
): Promise<PaginatedResponse<User>> {
  const { role, search, page = 1, pageSize = 20 } = filters;

  let query = "SELECT * FROM users WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
  const params: (string | number)[] = [];
  const countParams: (string | number)[] = [];

  if (role) {
    query += " AND role = ?";
    countQuery += " AND role = ?";
    params.push(role);
    countParams.push(role);
  }

  if (search) {
    query += " AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)";
    countQuery += " AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
    countParams.push(searchPattern, searchPattern, searchPattern);
  }

  // Count total
  const [countRows] = await pool.query<RowDataPacket[]>(
    countQuery,
    countParams,
  );
  const total = countRows[0].total;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(pageSize, offset);

  const [rows] = await pool.query<UserRow[]>(query, params);

  return {
    items: rows.map(mapUserRow),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// CREATE USER
// ============================================================

export async function createUser(input: UserCreateInput): Promise<User> {
  const { username, password, fullName, email, role } = input;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, password, full_name, email, role)
     VALUES (?, ?, ?, ?, ?)`,
    [username, hashedPassword, fullName, email, role],
  );

  const user = await getUserById(result.insertId);
  if (!user) throw new Error("Failed to create user");
  return user;
}

// ============================================================
// UPDATE USER
// ============================================================

export async function updateUser(
  id: number,
  input: UserUpdateInput,
): Promise<User | null> {
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.fullName !== undefined) {
    updates.push("full_name = ?");
    params.push(input.fullName);
  }
  if (input.email !== undefined) {
    updates.push("email = ?");
    params.push(input.email);
  }
  if (input.phone !== undefined) {
    updates.push("phone = ?");
    params.push(input.phone);
  }
  if (input.avatar !== undefined) {
    updates.push("avatar = ?");
    params.push(input.avatar);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }

  if (updates.length === 0) return getUserById(id);

  params.push(id);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  return getUserById(id);
}

// ============================================================
// UPDATE PASSWORD
// ============================================================

export async function updatePassword(
  id: number,
  newPassword: string,
): Promise<boolean> {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE users SET password = ? WHERE id = ?",
    [hashedPassword, id],
  );
  return result.affectedRows > 0;
}

// ============================================================
// VERIFY PASSWORD
// ============================================================

export async function verifyPassword(
  username: string,
  password: string,
): Promise<User | null> {
  const user = await getUserWithPassword(username);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  // Update last login
  await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [
    user.id,
  ]);

  // Remove password from returned user
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// ============================================================
// DELETE/SUSPEND USER
// ============================================================

export async function suspendUser(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE users SET status = 'suspended' WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

export async function activateUser(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE users SET status = 'active' WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

export async function deleteUser(id: number): Promise<boolean> {
  // Soft delete by setting status to inactive
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE users SET status = 'inactive' WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

export async function hardDeleteUser(id: number): Promise<boolean> {
  // Hard delete - permanently remove user and all related data
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete related data - only tables that definitely exist
    // Many tables have ON DELETE CASCADE so they'll auto-delete
    // We delete the most common ones explicitly

    // Try to delete from each table, ignore errors if table doesn't exist
    const tablesToClean = [
      "user_progress",
      "submissions",
      "session_submissions",
      "contest_submissions",
      "rankings",
      "contest_rankings",
      "class_members",
    ];

    for (const table of tablesToClean) {
      try {
        await connection.query(`DELETE FROM ${table} WHERE user_id = ?`, [id]);
      } catch (err: any) {
        // Ignore "table doesn't exist" errors, but log others
        if (!err.message?.includes("doesn't exist")) {
          console.warn(`Warning cleaning ${table}:`, err.message);
        }
      }
    }

    // Delete the user (this will cascade to other tables with FK constraints)
    const [result] = await connection.query<ResultSetHeader>(
      "DELETE FROM users WHERE id = ?",
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
// BULK CREATE USERS (for importing students)
// ============================================================

export interface BulkUserInput {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role: UserRole;
}

export async function bulkCreateStudents(
  users: BulkUserInput[],
  createdBy: number,
): Promise<{
  created: number;
  errors: Array<{ username: string; error: string }>;
}> {
  const errors: Array<{ username: string; error: string }> = [];
  let created = 0;

  for (const user of users) {
    try {
      await createUser({
        ...user,
        role: "student",
        createdBy,
      });
      created++;
    } catch (error) {
      errors.push({
        username: user.username,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { created, errors };
}

// ============================================================
// USER STATISTICS
// ============================================================

export async function getUserStats(): Promise<{
  total: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  recentlyCreated: number;
}> {
  const [roleStats] = await pool.query<RowDataPacket[]>(
    "SELECT role, COUNT(*) as count FROM users GROUP BY role",
  );

  const [statusStats] = await pool.query<RowDataPacket[]>(
    "SELECT status, COUNT(*) as count FROM users GROUP BY status",
  );

  const [recentStats] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
  );

  const byRole: Record<UserRole, number> = { admin: 0, teacher: 0, student: 0 };
  for (const row of roleStats) {
    byRole[row.role as UserRole] = row.count;
  }

  const byStatus: Record<UserStatus, number> = {
    active: 0,
    inactive: 0,
    suspended: 0,
  };
  for (const row of statusStats) {
    byStatus[row.status as UserStatus] = row.count;
  }

  return {
    total: Object.values(byRole).reduce((a, b) => a + b, 0),
    byRole,
    byStatus,
    recentlyCreated: recentStats[0].count,
  };
}

// ============================================================
// BULK CREATE USERS
// ============================================================

export async function bulkCreateUsers(
  users: BulkUserInput[],
  createdBy: number,
): Promise<{
  success: number;
  failed: number;
  errors: { username: string; error: string }[];
}> {
  let success = 0;
  let failed = 0;
  const errors: { username: string; error: string }[] = [];

  for (const user of users) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await pool.query(
        `INSERT INTO users (username, password, full_name, email, role)
         VALUES (?, ?, ?, ?, ?)`,
        [user.username, hashedPassword, user.fullName, user.email, user.role],
      );

      success++;
    } catch (error: any) {
      failed++;
      let errorMsg = "Lỗi không xác định";

      if (error.code === "ER_DUP_ENTRY") {
        errorMsg = "Username đã tồn tại";
      } else if (error.message) {
        errorMsg = error.message;
      }

      errors.push({
        username: user.username,
        error: errorMsg,
      });
    }
  }

  return { success, failed, errors };
}
