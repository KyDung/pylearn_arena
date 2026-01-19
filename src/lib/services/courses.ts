/**
 * 📚 Course Service - Quản lý truy vấn courses
 */
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export const CourseService = {
  /**
   * Lấy tất cả courses đã published
   */
  async getPublishedCourses(): Promise<Course[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, slug, title, description, difficulty, is_published, created_at, updated_at 
       FROM courses 
       WHERE is_published = true
       ORDER BY created_at ASC`,
    );
    return rows as Course[];
  },

  /**
   * Lấy course theo slug
   */
  async getCourseBySlug(slug: string): Promise<Course | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM courses WHERE slug = ?",
      [slug],
    );
    return rows.length > 0 ? (rows[0] as Course) : null;
  },

  /**
   * Lấy course theo ID
   */
  async getCourseById(id: number): Promise<Course | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM courses WHERE id = ?",
      [id],
    );
    return rows.length > 0 ? (rows[0] as Course) : null;
  },

  /**
   * Lấy tất cả courses (bao gồm chưa published)
   */
  async getAllCourses(): Promise<Course[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM courses ORDER BY created_at ASC`,
    );
    return rows as Course[];
  },
};

export default CourseService;
