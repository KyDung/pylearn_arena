/**
 * 📝 Lesson Service - Quản lý truy vấn lessons
 */
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export interface Lesson {
  id: number;
  topic_id: number;
  slug: string;
  title: string;
  description: string;
  summary: string;
  order_num: number;
  created_at: Date;
  updated_at: Date;
  game_count?: number;
}

export const LessonService = {
  /**
   * Lấy lessons của topic
   */
  async getLessonsByTopicId(topicId: number): Promise<Lesson[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, COUNT(g.id) as game_count
       FROM lessons l
       LEFT JOIN games g ON l.id = g.lesson_id
       WHERE l.topic_id = ?
       GROUP BY l.id
       ORDER BY l.order_num ASC`,
      [topicId],
    );
    return rows as Lesson[];
  },

  /**
   * Lấy lessons của course (theo slug)
   */
  async getLessonsByCourseSlug(courseSlug: string): Promise<Lesson[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.id, l.topic_id, l.slug, l.title, l.description, l.summary, l.order_num, l.created_at, l.updated_at
       FROM lessons l
       INNER JOIN topics t ON l.topic_id = t.id
       WHERE t.course_id = (SELECT id FROM courses WHERE slug = ?)
       ORDER BY l.order_num ASC`,
      [courseSlug],
    );
    return rows as Lesson[];
  },

  /**
   * Lấy lesson theo ID
   */
  async getLessonById(id: number): Promise<Lesson | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM lessons WHERE id = ?",
      [id],
    );
    return rows.length > 0 ? (rows[0] as Lesson) : null;
  },

  /**
   * Lấy lesson theo slug
   */
  async getLessonBySlug(slug: string): Promise<Lesson | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM lessons WHERE slug = ?",
      [slug],
    );
    return rows.length > 0 ? (rows[0] as Lesson) : null;
  },

  /**
   * Lấy thông tin đầy đủ của lesson (bao gồm topic và course)
   */
  async getLessonWithContext(lessonId: number): Promise<{
    lesson: Lesson;
    topic: { id: number; slug: string; title: string };
    course: { id: number; slug: string; title: string };
  } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, 
              t.id as topic_id, t.slug as topic_slug, t.title as topic_title,
              c.id as course_id, c.slug as course_slug, c.title as course_title
       FROM lessons l
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       WHERE l.id = ?`,
      [lessonId],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      lesson: {
        id: row.id,
        topic_id: row.topic_id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        summary: row.summary,
        order_num: row.order_num,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      topic: {
        id: row.topic_id,
        slug: row.topic_slug,
        title: row.topic_title,
      },
      course: {
        id: row.course_id,
        slug: row.course_slug,
        title: row.course_title,
      },
    };
  },
};

export default LessonService;
