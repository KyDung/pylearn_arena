/**
 * 📚 Course Service - Quản lý truy vấn courses
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

import { getErrorMessage } from "@/lib/errors";
export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  is_published: boolean;
  order_num: number;
  created_at: Date;
  updated_at: Date;
}

export const CourseService = {
  /**
   * Lấy tất cả courses đã published
   */
  async getPublishedCourses(): Promise<Course[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, slug, title, description, difficulty, order_num, is_published, created_at, updated_at
       FROM courses
       WHERE is_published = true
       ORDER BY order_num ASC, created_at ASC, id ASC`,
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
      `SELECT * FROM courses ORDER BY order_num ASC, created_at ASC, id ASC`,
    );
    return rows as Course[];
  },

  /**
   * Cập nhật course
   */
  async updateCourse(
    courseId: number,
    data: {
      title?: string;
      description?: string;
      difficulty?: string;
      is_published?: boolean;
      order_num?: number;
    },
  ): Promise<Course | null> {
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.difficulty !== undefined) {
      fields.push("difficulty = ?");
      values.push(data.difficulty);
    }
    if (data.is_published !== undefined) {
      fields.push("is_published = ?");
      values.push(data.is_published);
    }
    if (data.order_num !== undefined) {
      fields.push("order_num = ?");
      values.push(data.order_num);
    }

    if (fields.length === 0) return null;

    values.push(courseId.toString());
    await pool.query(
      `UPDATE courses SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      [...values.slice(0, -1), courseId],
    );

    return this.getCourseById(courseId);
  },

  // ============================================================
  // CASCADE DELETE FUNCTIONS (for dev content manager)
  // ============================================================

  /**
   * Xóa game và tất cả dữ liệu liên quan
   */
  async deleteGameCascade(
    gameId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query("DELETE FROM user_progress WHERE game_id = ?", [
        gameId,
      ]);
      await connection.query(
        "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
        ["game", gameId],
      );
      await connection.query("DELETE FROM games WHERE id = ?", [gameId]);

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      return { success: false, error: getErrorMessage(error) };
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa lesson và tất cả games
   */
  async deleteLessonCascade(
    lessonId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [games] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM games WHERE lesson_id = ?",
        [lessonId],
      );

      for (const game of games) {
        await connection.query("DELETE FROM user_progress WHERE game_id = ?", [
          game.id,
        ]);
        await connection.query(
          "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
          ["game", game.id],
        );
        await connection.query("DELETE FROM games WHERE id = ?", [game.id]);
      }

      await connection.query(
        "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
        ["lesson", lessonId],
      );
      await connection.query("DELETE FROM lessons WHERE id = ?", [lessonId]);

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      return { success: false, error: getErrorMessage(error) };
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa topic và tất cả lessons + games
   */
  async deleteTopicCascade(
    topicId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [lessons] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM lessons WHERE topic_id = ?",
        [topicId],
      );

      for (const lesson of lessons) {
        const [games] = await connection.query<RowDataPacket[]>(
          "SELECT id FROM games WHERE lesson_id = ?",
          [lesson.id],
        );

        for (const game of games) {
          await connection.query(
            "DELETE FROM user_progress WHERE game_id = ?",
            [game.id],
          );
          await connection.query(
            "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
            ["game", game.id],
          );
          await connection.query("DELETE FROM games WHERE id = ?", [game.id]);
        }

        await connection.query(
          "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
          ["lesson", lesson.id],
        );
        await connection.query("DELETE FROM lessons WHERE id = ?", [lesson.id]);
      }

      await connection.query(
        "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
        ["topic", topicId.toString()],
      );
      await connection.query("DELETE FROM topics WHERE id = ?", [topicId]);

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      return { success: false, error: getErrorMessage(error) };
    } finally {
      connection.release();
    }
  },

  /**
   * Xóa course và tất cả children
   */
  async deleteCourseCascade(
    courseId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [topics] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM topics WHERE course_id = ?",
        [courseId],
      );

      for (const topic of topics) {
        const [lessons] = await connection.query<RowDataPacket[]>(
          "SELECT id FROM lessons WHERE topic_id = ?",
          [topic.id],
        );

        for (const lesson of lessons) {
          const [games] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM games WHERE lesson_id = ?",
            [lesson.id],
          );

          for (const game of games) {
            await connection.query(
              "DELETE FROM user_progress WHERE game_id = ?",
              [game.id],
            );
            await connection.query(
              "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
              ["game", game.id],
            );
            await connection.query("DELETE FROM games WHERE id = ?", [game.id]);
          }

          await connection.query(
            "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
            ["lesson", lesson.id],
          );
          await connection.query("DELETE FROM lessons WHERE id = ?", [
            lesson.id,
          ]);
        }

        await connection.query(
          "DELETE FROM course_content_access WHERE content_type = ? AND content_id = ?",
          ["topic", topic.id.toString()],
        );
        await connection.query("DELETE FROM topics WHERE id = ?", [topic.id]);
      }

      await connection.query(
        "DELETE FROM class_course_settings WHERE course_id = ?",
        [courseId],
      );
      await connection.query("DELETE FROM courses WHERE id = ?", [courseId]);

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      return { success: false, error: getErrorMessage(error) };
    } finally {
      connection.release();
    }
  },

  /**
   * Tạo course mới
   */
  async createCourse(data: {
    slug: string;
    title: string;
    description: string;
    difficulty: string;
    is_published?: boolean;
  }): Promise<{ success: boolean; courseId?: number; error?: string }> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO courses (slug, title, description, difficulty, is_published)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.slug,
          data.title,
          data.description,
          data.difficulty,
          data.is_published ?? false,
        ],
      );
      return { success: true, courseId: result.insertId };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /**
   * Tạo topic mới
   */
  async createTopic(data: {
    course_id: number;
    slug: string;
    title: string;
    description: string;
    order_num: number;
  }): Promise<{ success: boolean; topicId?: number; error?: string }> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO topics (course_id, slug, title, description, order_num)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.course_id,
          data.slug,
          data.title,
          data.description,
          data.order_num,
        ],
      );
      return { success: true, topicId: result.insertId };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /**
   * Tạo lesson mới
   */
  async createLesson(data: {
    topic_id: number;
    slug: string;
    title: string;
    description: string;
    summary: string;
    order_num: number;
  }): Promise<{ success: boolean; lessonId?: string; error?: string }> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO lessons (topic_id, slug, title, description, summary, order_num)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.topic_id,
          data.slug,
          data.title,
          data.description,
          data.summary,
          data.order_num,
        ],
      );
      return { success: true, lessonId: result.insertId.toString() };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  /**
   * Tạo game mới
   */
  async createGame(data: {
    lesson_id: string;
    slug: string;
    title: string;
    description?: string;
    order_num: number;
    path?: string;
    game_type?: string;
  }): Promise<{ success: boolean; gameId?: string; error?: string }> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO games (lesson_id, slug, title, description, order_num, path, game_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.lesson_id,
          data.slug,
          data.title,
          data.description || "",
          data.order_num,
          data.path || null,
          data.game_type || "type1",
        ],
      );
      return { success: true, gameId: result.insertId.toString() };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  },
};

// ============================================================
// TOPIC SERVICE
// ============================================================

export interface Topic {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  description: string;
  order_num: number;
}

export const TopicService = {
  async getTopicsByCourse(courseId: number): Promise<Topic[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM topics WHERE course_id = ? ORDER BY order_num",
      [courseId],
    );
    return rows as Topic[];
  },

  async getTopicById(topicId: number): Promise<Topic | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM topics WHERE id = ?",
      [topicId],
    );
    return rows.length > 0 ? (rows[0] as Topic) : null;
  },

  async updateTopic(
    topicId: number,
    data: { title?: string; description?: string; order_num?: number },
  ): Promise<Topic | null> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.order_num !== undefined) {
      fields.push("order_num = ?");
      values.push(data.order_num);
    }

    if (fields.length === 0) return null;

    await pool.query(`UPDATE topics SET ${fields.join(", ")} WHERE id = ?`, [
      ...values,
      topicId,
    ]);

    return this.getTopicById(topicId);
  },
};

// ============================================================
// LESSON SERVICE
// ============================================================

export interface Lesson {
  id: string;
  topic_id: number;
  slug: string;
  title: string;
  description: string;
  summary: string;
  order_num: number;
}

export const LessonService = {
  async getLessonsByTopic(topicId: number): Promise<Lesson[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM lessons WHERE topic_id = ? ORDER BY order_num",
      [topicId],
    );
    return rows as Lesson[];
  },

  async getLessonById(lessonId: string): Promise<Lesson | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM lessons WHERE id = ?",
      [lessonId],
    );
    return rows.length > 0 ? (rows[0] as Lesson) : null;
  },

  async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      summary?: string;
      order_num?: number;
    },
  ): Promise<Lesson | null> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.summary !== undefined) {
      fields.push("summary = ?");
      values.push(data.summary);
    }
    if (data.order_num !== undefined) {
      fields.push("order_num = ?");
      values.push(data.order_num);
    }

    if (fields.length === 0) return null;

    await pool.query(`UPDATE lessons SET ${fields.join(", ")} WHERE id = ?`, [
      ...values,
      lessonId,
    ]);

    return this.getLessonById(lessonId);
  },
};

// ============================================================
// GAME SERVICE
// ============================================================

export interface Game {
  id: string;
  lesson_id: number;
  slug: string;
  title: string;
  description: string;
  path: string;
  order_num: number;
}

export const GameService = {
  async getGamesByLesson(lessonId: string): Promise<Game[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM games WHERE lesson_id = ? ORDER BY order_num",
      [lessonId],
    );
    return rows as Game[];
  },

  async getGameById(gameId: string): Promise<Game | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM games WHERE id = ?",
      [gameId],
    );
    return rows.length > 0 ? (rows[0] as Game) : null;
  },

  async updateGame(
    gameId: string,
    data: {
      title?: string;
      description?: string;
      path?: string;
      order_num?: number;
    },
  ): Promise<Game | null> {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.path !== undefined) {
      fields.push("path = ?");
      values.push(data.path);
    }
    if (data.order_num !== undefined) {
      fields.push("order_num = ?");
      values.push(data.order_num);
    }

    if (fields.length === 0) return null;

    await pool.query(`UPDATE games SET ${fields.join(", ")} WHERE id = ?`, [
      ...values,
      gameId,
    ]);

    return this.getGameById(gameId);
  },

  async getAllGames(): Promise<Game[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT g.*, l.title as lesson_title, t.title as topic_title, c.title as course_title
      FROM games g
      LEFT JOIN lessons l ON g.lesson_id = l.id
      LEFT JOIN topics t ON l.topic_id = t.id
      LEFT JOIN courses c ON t.course_id = c.id
      ORDER BY c.order_num, c.title, t.order_num, l.order_num, g.order_num
    `);
    return rows as Game[];
  },
};

// ============================================================
// COURSE ACCESS SERVICE
// ============================================================

export interface CourseAccess {
  id: number;
  class_id: number;
  class_name?: string;
  course_id: number;
  course_title?: string;
  granted_by: number;
  is_active: boolean;
  granted_at: Date;
  expires_at: Date | null;
}

export const CourseAccessService = {
  async getClassCourseAccess(classId: number): Promise<CourseAccess[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        ca.*,
        c.title as course_title,
        cl.name as class_name
      FROM course_access ca
      JOIN courses c ON c.id = ca.course_id
      JOIN classes cl ON cl.id = ca.class_id
      WHERE ca.class_id = ? AND ca.is_active = TRUE
      ORDER BY c.order_num ASC, c.title ASC
    `,
      [classId],
    );
    return rows as CourseAccess[];
  },

  async grantCourseAccess(
    classId: number,
    courseId: number,
    grantedBy: number,
    expiresAt?: Date,
  ): Promise<void> {
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM course_access WHERE class_id = ? AND course_id = ?",
      [classId, courseId],
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE course_access SET is_active = TRUE, granted_by = ?, expires_at = ? WHERE class_id = ? AND course_id = ?",
        [grantedBy, expiresAt || null, classId, courseId],
      );
    } else {
      await pool.query(
        "INSERT INTO course_access (class_id, course_id, granted_by, expires_at) VALUES (?, ?, ?, ?)",
        [classId, courseId, grantedBy, expiresAt || null],
      );
    }
  },

  async revokeCourseAccess(classId: number, courseId: number): Promise<void> {
    await pool.query(
      "UPDATE course_access SET is_active = FALSE WHERE class_id = ? AND course_id = ?",
      [classId, courseId],
    );
  },

  async userHasCourseAccess(
    userId: number,
    courseId: number,
  ): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 1 FROM class_members cm
      JOIN course_access ca ON ca.class_id = cm.class_id
      WHERE cm.user_id = ? 
        AND ca.course_id = ? 
        AND ca.is_active = TRUE
        AND cm.status = 'active'
        AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
      LIMIT 1
    `,
      [userId, courseId],
    );
    return rows.length > 0;
  },

  async getUserAccessibleCourses(userId: number): Promise<Course[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT DISTINCT c.* FROM courses c
      JOIN course_access ca ON ca.course_id = c.id
      JOIN class_members cm ON cm.class_id = ca.class_id
      WHERE cm.user_id = ?
        AND ca.is_active = TRUE
        AND cm.status = 'active'
        AND c.is_published = TRUE
        AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
      ORDER BY c.order_num ASC, c.title ASC
    `,
      [userId],
    );
    return rows as Course[];
  },
};

// ============================================================
// LESSON SESSION (Quick submit for in-class ranking)
// ============================================================

export default CourseService;
