/**
 * 🎮 Game Service - Quản lý truy vấn games
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

export interface Game {
  id: number;
  lesson_id: number;
  slug: string;
  title: string;
  description: string;
  order_num: number;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface GameWithContext extends Game {
  lesson_slug: string;
  lesson_title: string;
  topic_slug: string;
  topic_title: string;
  course_slug: string;
  course_title: string;
}

export const GameService = {
  /**
   * Lấy games của lesson
   */
  async getGamesByLessonId(lessonId: number): Promise<Game[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM games WHERE lesson_id = ? ORDER BY order_num ASC`,
      [lessonId],
    );
    return rows as Game[];
  },

  /**
   * Lấy game theo ID
   */
  async getGameById(id: number): Promise<Game | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM games WHERE id = ?",
      [id],
    );
    return rows.length > 0 ? (rows[0] as Game) : null;
  },

  /**
   * Lấy game theo slug
   */
  async getGameBySlug(slug: string): Promise<Game | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM games WHERE slug = ?",
      [slug],
    );
    return rows.length > 0 ? (rows[0] as Game) : null;
  },

  /**
   * Lấy game theo path
   */
  async getGameByPath(path: string): Promise<Game | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM games WHERE path = ?",
      [path],
    );
    return rows.length > 0 ? (rows[0] as Game) : null;
  },

  /**
   * Lấy tất cả games với context đầy đủ
   */
  async getAllGamesWithContext(): Promise<GameWithContext[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT g.*,
              l.slug as lesson_slug, l.title as lesson_title,
              t.slug as topic_slug, t.title as topic_title,
              c.slug as course_slug, c.title as course_title
       FROM games g
       INNER JOIN lessons l ON g.lesson_id = l.id
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       ORDER BY c.id, t.order_num, l.order_num, g.order_num`,
    );
    return rows as GameWithContext[];
  },

  /**
   * Tạo path chuẩn cho game
   * Format: course-slug/topic-slug/lesson-slug/game-id
   */
  generateGamePath(
    courseSlug: string,
    topicSlug: string,
    lessonSlug: string,
    gameId: string,
  ): string {
    return `${courseSlug}/${topicSlug}/${lessonSlug}/${gameId}`;
  },

  /**
   * Thêm game mới
   */
  async createGame(data: {
    lessonId: number;
    slug: string;
    title: string;
    description: string;
    orderNum: number;
    path: string;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO games (lesson_id, slug, title, description, order_num, path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (lesson_id, slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         order_num = EXCLUDED.order_num,
         path = EXCLUDED.path,
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.lessonId,
        data.slug,
        data.title,
        data.description,
        data.orderNum,
        data.path,
      ],
    );
    return result.insertId;
  },

  /**
   * Đếm số games của lesson
   */
  async countGamesByLessonId(lessonId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM games WHERE lesson_id = ?",
      [lessonId],
    );
    return rows[0].count;
  },
};

export default GameService;
