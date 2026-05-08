/**
 * 🏆 Contest Service - Quản lý cuộc thi lập trình
 * Khác biệt với Sessions:
 * - Có thời gian bắt đầu/kết thúc cụ thể (không dùng duration_minutes)
 * - Có giải thưởng (prizes)
 * - Có cấu hình hiển thị leaderboard linh hoạt hơn
 * - Có cơ chế nộp muộn với penalty
 * - Rankings được tính toán và cache riêng
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Contest {
  id: number;
  class_id: number;
  game_id: number;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  result_announce_time?: Date;
  max_submissions: number;
  allow_late_submission: boolean;
  late_penalty_percent: number;
  show_leaderboard: boolean;
  show_leaderboard_scores: boolean;
  prizes?: Record<string, string>; // {"1st": "100K", "2nd": "50K", "3rd": "25K"}
  status: "draft" | "published" | "ongoing" | "ended" | "archived";
  created_by: number;
  total_participants: number;
  total_submissions: number;
  created_at: Date;
  updated_at: Date;
}

export interface ContestWithDetails extends Contest {
  class_name?: string;
  game_title?: string;
  game_path?: string;
  creator_name?: string;
  is_started?: boolean;
  is_ended?: boolean;
  remaining_minutes?: number;
}

export interface CreateContestData {
  class_id: number;
  game_id: number;
  title: string;
  description?: string;
  start_time: Date | string;
  end_time: Date | string;
  result_announce_time?: Date | string;
  max_submissions?: number;
  allow_late_submission?: boolean;
  late_penalty_percent?: number;
  show_leaderboard?: boolean;
  show_leaderboard_scores?: boolean;
  prizes?: Record<string, string>;
  status?: "draft" | "published";
  created_by: number;
}

export interface ContestFilters {
  class_id?: number;
  game_id?: number;
  status?: "draft" | "published" | "ongoing" | "ended" | "archived";
  created_by?: number;
  page?: number;
  pageSize?: number;
}

export interface ContestSubmission {
  id: number;
  contest_id: number;
  user_id: number;
  code: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  execution_time?: number;
  is_late: boolean;
  final_score: number;
  status: "pending" | "running" | "passed" | "failed" | "error";
  error_message?: string;
  attempt_number: number;
  submitted_at: Date;
  graded_at?: Date;
}

export interface ContestRanking {
  rank_position: number;
  user_id: number;
  username: string;
  full_name: string;
  best_score: number;
  total_attempts: number;
  first_submission_at?: Date;
  best_submission_at?: Date;
}

export const ContestService = {
  /**
   * Tạo contest mới
   */
  async createContest(data: CreateContestData): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contests (
        class_id, game_id, title, description, start_time, end_time, result_announce_time,
        max_submissions, allow_late_submission, late_penalty_percent,
        show_leaderboard, show_leaderboard_scores, prizes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.class_id,
        data.game_id,
        data.title,
        data.description || null,
        data.start_time,
        data.end_time,
        data.result_announce_time || null,
        data.max_submissions ?? 10,
        data.allow_late_submission ?? false,
        data.late_penalty_percent ?? 20.0,
        data.show_leaderboard ?? true,
        data.show_leaderboard_scores ?? false,
        data.prizes ? JSON.stringify(data.prizes) : null,
        data.status || "draft",
        data.created_by,
      ],
    );
    return result.insertId;
  },

  /**
   * Cập nhật contest
   */
  async updateContest(
    id: number,
    data: Partial<CreateContestData>,
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.start_time !== undefined) {
      fields.push("start_time = ?");
      values.push(data.start_time);
    }
    if (data.end_time !== undefined) {
      fields.push("end_time = ?");
      values.push(data.end_time);
    }
    if (data.result_announce_time !== undefined) {
      fields.push("result_announce_time = ?");
      values.push(data.result_announce_time);
    }
    if (data.max_submissions !== undefined) {
      fields.push("max_submissions = ?");
      values.push(data.max_submissions);
    }
    if (data.allow_late_submission !== undefined) {
      fields.push("allow_late_submission = ?");
      values.push(data.allow_late_submission);
    }
    if (data.late_penalty_percent !== undefined) {
      fields.push("late_penalty_percent = ?");
      values.push(data.late_penalty_percent);
    }
    if (data.show_leaderboard !== undefined) {
      fields.push("show_leaderboard = ?");
      values.push(data.show_leaderboard);
    }
    if (data.show_leaderboard_scores !== undefined) {
      fields.push("show_leaderboard_scores = ?");
      values.push(data.show_leaderboard_scores);
    }
    if (data.prizes !== undefined) {
      fields.push("prizes = ?");
      values.push(JSON.stringify(data.prizes));
    }
    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE contests SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    return result.affectedRows > 0;
  },

  /**
   * Lấy danh sách contests với filters
   */
  async getContests(
    filters: ContestFilters,
  ): Promise<{ items: ContestWithDetails[]; total: number }> {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (filters.class_id) {
      conditions.push("c.class_id = ?");
      params.push(filters.class_id);
    }

    if (filters.game_id) {
      conditions.push("c.game_id = ?");
      params.push(filters.game_id);
    }

    if (filters.status) {
      conditions.push("c.status = ?");
      params.push(filters.status);
    }

    if (filters.created_by) {
      conditions.push("c.created_by = ?");
      params.push(filters.created_by);
    }

    const whereClause = conditions.join(" AND ");

    // Count total
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM contests c WHERE ${whereClause}`,
      params,
    );
    const total = countRows[0].total;

    // Get paginated data
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        cl.name as class_name,
        g.title as game_title,
        g.path as game_path,
        u.username as creator_name,
        NOW() >= c.start_time as is_started,
        NOW() >= c.end_time as is_ended,
        CASE 
          WHEN NOW() < c.start_time THEN TIMESTAMPDIFF(MINUTE, NOW(), c.start_time)
          WHEN NOW() < c.end_time THEN TIMESTAMPDIFF(MINUTE, NOW(), c.end_time)
          ELSE 0
        END as remaining_minutes
       FROM contests c
       LEFT JOIN classes cl ON c.class_id = cl.id
       LEFT JOIN games g ON c.game_id = g.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE ${whereClause}
       ORDER BY c.start_time DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    // Parse prizes JSON
    const items = rows.map((row: any) => ({
      ...row,
      prizes: row.prizes ? JSON.parse(row.prizes) : null,
    }));

    return {
      items: items as ContestWithDetails[],
      total,
    };
  },

  /**
   * Lấy contest theo ID
   */
  async getContestById(id: number): Promise<ContestWithDetails | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        cl.name as class_name,
        g.title as game_title,
        g.path as game_path,
        u.username as creator_name,
        NOW() >= c.start_time as is_started,
        NOW() >= c.end_time as is_ended,
        CASE 
          WHEN NOW() < c.start_time THEN TIMESTAMPDIFF(MINUTE, NOW(), c.start_time)
          WHEN NOW() < c.end_time THEN TIMESTAMPDIFF(MINUTE, NOW(), c.end_time)
          ELSE 0
        END as remaining_minutes
       FROM contests c
       LEFT JOIN classes cl ON c.class_id = cl.id
       LEFT JOIN games g ON c.game_id = g.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [id],
    );

    if (rows.length === 0) return null;

    const contest = {
      ...rows[0],
      prizes: rows[0].prizes ? JSON.parse(rows[0].prizes) : null,
    };

    return contest as ContestWithDetails;
  },

  /**
   * Xóa contest
   */
  async deleteContest(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM contests WHERE id = ?`,
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Publish contest
   */
  async publishContest(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE contests SET status = 'published' WHERE id = ? AND status = 'draft'`,
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Archive contest
   */
  async archiveContest(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE contests SET status = 'archived' WHERE id = ?`,
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Kiểm tra contest có accept submissions không
   */
  async canSubmit(
    contestId: number,
  ): Promise<{ can: boolean; reason?: string }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        status,
        NOW() >= start_time as is_started,
        NOW() <= end_time as is_ended,
        allow_late_submission
       FROM contests WHERE id = ?`,
      [contestId],
    );

    if (rows.length === 0) {
      return { can: false, reason: "Contest not found" };
    }

    const contest = rows[0];

    if (contest.status !== "published" && contest.status !== "ongoing") {
      return { can: false, reason: "Contest is not published" };
    }

    if (!contest.is_started) {
      return { can: false, reason: "Contest has not started yet" };
    }

    if (contest.is_ended && !contest.allow_late_submission) {
      return { can: false, reason: "Contest has ended" };
    }

    return { can: true };
  },

  /**
   * Submit code tới contest
   */
  async submitCode(data: {
    contest_id: number;
    user_id: number;
    code: string;
    score: number;
    passed_tests: number;
    total_tests: number;
    execution_time?: number;
  }): Promise<number> {
    // Check max_submissions
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM contest_submissions 
       WHERE contest_id = ? AND user_id = ?`,
      [data.contest_id, data.user_id],
    );

    const contest = await this.getContestById(data.contest_id);
    if (!contest) throw new Error("Contest not found");

    const currentCount = countRows[0].count;
    if (currentCount >= contest.max_submissions) {
      throw new Error(
        `Maximum submissions reached (${contest.max_submissions})`,
      );
    }

    // Check if late
    const isLate = new Date() > new Date(contest.end_time);
    let finalScore = data.score;

    if (isLate && contest.allow_late_submission) {
      finalScore = data.score * (1 - contest.late_penalty_percent / 100);
    }

    // Insert submission
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contest_submissions (
        contest_id, user_id, code, score, passed_tests, total_tests,
        execution_time, is_late, final_score, status, attempt_number, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'passed', ?, NOW())`,
      [
        data.contest_id,
        data.user_id,
        data.code,
        data.score,
        data.passed_tests,
        data.total_tests,
        data.execution_time || null,
        isLate,
        finalScore,
        currentCount + 1,
      ],
    );

    const submissionId = result.insertId;

    // Update contest_rankings
    await this.updateRanking(
      data.contest_id,
      data.user_id,
      finalScore,
      submissionId,
    );

    // Update contest stats
    await this.updateContestStats(data.contest_id);

    return submissionId;
  },

  /**
   * Update ranking cho user
   */
  async updateRanking(
    contestId: number,
    userId: number,
    score: number,
    submissionId: number,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO contest_rankings (contest_id, user_id, best_score, best_submission_id, total_attempts, first_submission_at, best_submission_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         best_score = IF(? > best_score, ?, best_score),
         best_submission_id = IF(? > best_score, ?, best_submission_id),
         best_submission_at = IF(? > best_score, NOW(), best_submission_at),
         total_attempts = total_attempts + 1`,
      [
        contestId,
        userId,
        score,
        submissionId,
        score,
        score,
        submissionId,
        score,
        submissionId,
        score,
      ],
    );

    // Recalculate all ranks for this contest
    await pool.query(
      `SET @rank := 0;
       UPDATE contest_rankings
       SET rank_position = (@rank := @rank + 1)
       WHERE contest_id = ?
       ORDER BY best_score DESC, best_submission_at ASC`,
      [contestId],
    );
  },

  /**
   * Lấy leaderboard contest
   */
  async getLeaderboard(contestId: number): Promise<ContestRanking[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        r.rank_position,
        r.user_id,
        u.username,
        u.full_name,
        r.best_score,
        r.total_attempts,
        r.first_submission_at,
        r.best_submission_at
       FROM contest_rankings r
       JOIN users u ON r.user_id = u.id
       WHERE r.contest_id = ?
       ORDER BY r.rank_position ASC`,
      [contestId],
    );

    return rows as ContestRanking[];
  },

  /**
   * Lấy submissions của user trong contest
   */
  async getUserSubmissions(
    contestId: number,
    userId: number,
  ): Promise<ContestSubmission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM contest_submissions
       WHERE contest_id = ? AND user_id = ?
       ORDER BY submitted_at DESC`,
      [contestId, userId],
    );

    return rows as ContestSubmission[];
  },

  /**
   * Lấy ongoing contests cho học sinh
   */
  async getOngoingContestsForStudent(
    userId: number,
  ): Promise<ContestWithDetails[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        c.*,
        cl.name as class_name,
        g.title as game_title,
        g.path as game_path,
        u.username as creator_name,
        NOW() >= c.start_time as is_started,
        NOW() >= c.end_time as is_ended,
        TIMESTAMPDIFF(MINUTE, NOW(), c.end_time) as remaining_minutes
       FROM contests c
       INNER JOIN classes cl ON c.class_id = cl.id
       INNER JOIN class_members cm ON cl.id = cm.class_id
       LEFT JOIN games g ON c.game_id = g.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE cm.user_id = ? AND cm.status = 'active' 
         AND c.status IN ('published', 'ongoing')
         AND NOW() >= c.start_time
         AND (NOW() <= c.end_time OR c.allow_late_submission = TRUE)
       ORDER BY c.end_time ASC`,
      [userId],
    );

    return rows.map((row: any) => ({
      ...row,
      prizes: row.prizes ? JSON.parse(row.prizes) : null,
    })) as ContestWithDetails[];
  },

  /**
   * Update contest stats
   */
  async updateContestStats(contestId: number): Promise<void> {
    await pool.query(
      `UPDATE contests c
       SET 
         total_participants = (SELECT COUNT(DISTINCT user_id) FROM contest_submissions WHERE contest_id = ?),
         total_submissions = (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = ?)
       WHERE id = ?`,
      [contestId, contestId, contestId],
    );
  },

  /**
   * Check permission
   */
  async canManageContest(
    contestId: number,
    userId: number,
    userRole: string,
  ): Promise<boolean> {
    if (userRole === "admin") return true;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id FROM contests c
       INNER JOIN classes cl ON c.class_id = cl.id
       WHERE c.id = ? AND cl.teacher_id = ?`,
      [contestId, userId],
    );
    return rows.length > 0;
  },

  /**
   * Auto-update contest status based on time
   */
  async autoUpdateStatuses(): Promise<void> {
    // Update to 'ongoing' when start_time reached
    await pool.query(
      `UPDATE contests 
       SET status = 'ongoing'
       WHERE status = 'published' AND NOW() >= start_time AND NOW() < end_time`,
    );

    // Update to 'ended' when end_time passed
    await pool.query(
      `UPDATE contests 
       SET status = 'ended'
       WHERE status IN ('published', 'ongoing') AND NOW() >= end_time`,
    );
  },
};

export default ContestService;
