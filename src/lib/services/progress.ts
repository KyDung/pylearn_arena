/**
 * 📊 Progress Service - Quản lý tiến độ học tập
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface UserProgress {
  id: number;
  user_id: number;
  game_id: number;
  is_completed: boolean;
  score: number;
  attempts: number;
  last_attempt_at: Date;
  completed_at: Date | null;
  game_title?: string;
  game_slug?: string;
  lesson_title?: string;
  lesson_slug?: string;
}

export const ProgressService = {
  /**
   * Lấy tiến độ của user
   */
  async getUserProgress(userId: number, courseSlug?: string): Promise<UserProgress[]> {
    let query = `
      SELECT up.*, g.title as game_title, g.slug as game_slug,
             l.title as lesson_title, l.slug as lesson_slug
      FROM user_progress up
      INNER JOIN games g ON up.game_id = g.id
      INNER JOIN lessons l ON g.lesson_id = l.id
      WHERE up.user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (courseSlug) {
      query += ` AND l.topic_id IN (
        SELECT id FROM topics WHERE course_id = (
          SELECT id FROM courses WHERE slug = ?
        )
      )`;
      params.push(courseSlug);
    }

    query += " ORDER BY up.last_attempt_at DESC";

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as UserProgress[];
  },

  /**
   * Lấy tiến độ của game cụ thể
   */
  async getGameProgress(userId: number, gameId: number): Promise<UserProgress | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM user_progress WHERE user_id = ? AND game_id = ?",
      [userId, gameId]
    );
    return rows.length > 0 ? (rows[0] as UserProgress) : null;
  },

  /**
   * Cập nhật tiến độ
   */
  async updateProgress(data: {
    userId: number;
    gameId: number;
    isCompleted: boolean;
    score: number;
  }): Promise<void> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO user_progress (user_id, game_id, is_completed, score, attempts, last_attempt_at, completed_at)
       VALUES (?, ?, ?, ?, 1, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         is_completed = IF(VALUES(is_completed), true, is_completed),
         score = GREATEST(score, VALUES(score)),
         attempts = attempts + 1,
         last_attempt_at = NOW(),
         completed_at = IF(VALUES(is_completed) AND completed_at IS NULL, NOW(), completed_at)`,
      [data.userId, data.gameId, data.isCompleted, data.score, data.isCompleted ? new Date() : null]
    );
  },

  /**
   * Thống kê tiến độ theo course
   */
  async getCourseStats(userId: number, courseSlug: string): Promise<{
    totalGames: number;
    completedGames: number;
    totalScore: number;
    completionRate: number;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         COUNT(DISTINCT g.id) as total_games,
         COUNT(DISTINCT CASE WHEN up.is_completed = true THEN g.id END) as completed_games,
         COALESCE(SUM(up.score), 0) as total_score
       FROM games g
       INNER JOIN lessons l ON g.lesson_id = l.id
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       LEFT JOIN user_progress up ON g.id = up.game_id AND up.user_id = ?
       WHERE c.slug = ?`,
      [userId, courseSlug]
    );

    const stats = rows[0];
    return {
      totalGames: stats.total_games,
      completedGames: stats.completed_games,
      totalScore: stats.total_score,
      completionRate: stats.total_games > 0 
        ? Math.round((stats.completed_games / stats.total_games) * 100) 
        : 0,
    };
  },
};

export default ProgressService;
