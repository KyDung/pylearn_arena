/**
 * 📂 Topic Service - Quản lý truy vấn topics
 */
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export interface Topic {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  description: string;
  order_num: number;
  lesson_count?: number;
}

export const TopicService = {
  /**
   * Lấy topics của course với số lượng lessons
   */
  async getTopicsByCourseId(courseId: number): Promise<Topic[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.course_id, t.slug, t.title, t.description, t.order_num,
              COUNT(l.id) as lesson_count
       FROM topics t
       LEFT JOIN lessons l ON t.id = l.topic_id
       WHERE t.course_id = ?
       GROUP BY t.id, t.course_id, t.slug, t.title, t.description, t.order_num
       ORDER BY t.order_num ASC`,
      [courseId]
    );
    return rows as Topic[];
  },

  /**
   * Lấy topics của course theo slug
   */
  async getTopicsByCourseSlug(courseSlug: string): Promise<Topic[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.course_id, t.slug, t.title, t.description, t.order_num,
              COUNT(l.id) as lesson_count
       FROM topics t
       LEFT JOIN lessons l ON t.id = l.topic_id
       WHERE t.course_id = (SELECT id FROM courses WHERE slug = ?)
       GROUP BY t.id, t.course_id, t.slug, t.title, t.description, t.order_num
       ORDER BY t.order_num ASC`,
      [courseSlug]
    );
    return rows as Topic[];
  },

  /**
   * Lấy topic theo ID
   */
  async getTopicById(id: number): Promise<Topic | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM topics WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? (rows[0] as Topic) : null;
  },

  /**
   * Lấy topic theo slug
   */
  async getTopicBySlug(slug: string): Promise<Topic | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );
    return rows.length > 0 ? (rows[0] as Topic) : null;
  },
};

export default TopicService;
