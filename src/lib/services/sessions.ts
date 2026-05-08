/**
 * 🎯 Session Service - Quản lý live submission sessions
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

export interface Session {
  id: number;
  class_id: number;
  game_id: number;
  title: string;
  description?: string;
  started_at: Date;
  closed_at?: Date;
  duration_minutes: number;
  max_submissions?: number | null;
  auto_close: boolean;
  status: "active" | "closed";
  created_by: number;
  total_submissions: number;
  unique_submitters: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionWithDetails extends Session {
  class_name?: string;
  game_title?: string;
  creator_name?: string;
}

export interface CreateSessionData {
  class_id: number;
  game_id: number;
  title: string;
  description?: string;
  duration_minutes?: number;
  max_submissions?: number | null;
  auto_close?: boolean;
  created_by: number;
}

export interface SessionFilters {
  class_id?: number;
  game_id?: number;
  status?: "active" | "closed";
  created_by?: number;
  page?: number;
  pageSize?: number;
}

export const SessionService = {
  /**
   * Tạo session mới
   */
  async createSession(data: CreateSessionData): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO sessions (class_id, game_id, title, description, duration_minutes, max_submissions, auto_close, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.class_id,
        data.game_id,
        data.title,
        data.description || null,
        data.duration_minutes || 60,
        data.max_submissions ?? null,
        data.auto_close ?? true,
        data.created_by,
      ],
    );
    return result.insertId;
  },

  /**
   * Lấy danh sách sessions với filters
   */
  async getSessions(
    filters: SessionFilters,
  ): Promise<{ items: SessionWithDetails[]; total: number }> {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (filters.class_id) {
      conditions.push("s.class_id = ?");
      params.push(filters.class_id);
    }

    if (filters.game_id) {
      conditions.push("s.game_id = ?");
      params.push(filters.game_id);
    }

    if (filters.status) {
      conditions.push("s.status = ?");
      params.push(filters.status);
    }

    if (filters.created_by) {
      conditions.push("s.created_by = ?");
      params.push(filters.created_by);
    }

    const whereClause = conditions.join(" AND ");

    // Count total
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM sessions s WHERE ${whereClause}`,
      params,
    );
    const total = countRows[0].total;

    // Get paginated data
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        c.name as class_name,
        g.title as game_title,
        u.username as creator_name
       FROM sessions s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN games g ON s.game_id = g.id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return {
      items: rows as SessionWithDetails[],
      total,
    };
  },

  /**
   * Lấy session theo ID
   */
  async getSessionById(id: number): Promise<SessionWithDetails | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        c.name as class_name,
        g.title as game_title,
        u.username as creator_name
       FROM sessions s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN games g ON s.game_id = g.id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = ?`,
      [id],
    );
    return rows.length > 0 ? (rows[0] as SessionWithDetails) : null;
  },

  /**
   * Đóng session
   */
  async closeSession(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE sessions 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Kiểm tra session có active không
   */
  async isSessionActive(id: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT status FROM sessions WHERE id = ?`,
      [id],
    );
    return rows.length > 0 && rows[0].status === "active";
  },

  /**
   * Lấy active session cho game và class
   */
  async getActiveSessionForGame(
    gameId: number,
    classId: number,
  ): Promise<Session | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sessions 
       WHERE game_id = ? AND class_id = ? AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [gameId, classId],
    );
    return rows.length > 0 ? (rows[0] as Session) : null;
  },

  /**
   * Lấy active sessions cho học sinh (theo các lớp của họ)
   */
  async getActiveSessionsForStudent(
    userId: number,
  ): Promise<SessionWithDetails[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        c.name as class_name,
        g.title as game_title,
        g.path as game_path,
        u.username as creator_name,
        GREATEST(0, s.duration_minutes - FLOOR(EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60)) as remaining_minutes
       FROM sessions s
       INNER JOIN classes c ON s.class_id = c.id
       INNER JOIN class_members cm ON c.id = cm.class_id
       LEFT JOIN games g ON s.game_id = g.id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE cm.user_id = ? AND cm.status = 'active' AND s.status = 'active'
         AND (s.duration_minutes IS NULL OR 
              FLOOR(EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 60) < s.duration_minutes)
       ORDER BY s.created_at DESC`,
      [userId],
    );
    return rows as SessionWithDetails[];
  },

  /**
   * Update session stats (sau khi có submission mới)
   */
  async updateSessionStats(sessionId: number): Promise<void> {
    await pool.query(
      `UPDATE sessions s
       SET 
         total_submissions = (SELECT COUNT(*) FROM session_submissions WHERE session_id = ?),
         unique_submitters = (SELECT COUNT(DISTINCT user_id) FROM session_submissions WHERE session_id = ?)
       WHERE id = ?`,
      [sessionId, sessionId, sessionId],
    );
  },

  /**
   * Check permission - Teacher chỉ thao tác với lớp của mình, Admin toàn quyền
   */
  async canManageSession(
    sessionId: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    if (userRole === "admin") return true;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.id FROM sessions s
       INNER JOIN classes c ON s.class_id = c.id
       WHERE s.id = ? AND c.teacher_id = ?`,
      [sessionId, userId],
    );
    return rows.length > 0;
  },
};

export default SessionService;
