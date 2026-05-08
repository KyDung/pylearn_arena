/**
 * 📚 Course Service - Quản lý truy vấn courses
 */
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

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
    },
  ): Promise<Course | null> {
    const fields: string[] = [];
    const values: (string | boolean)[] = [];

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
    } catch (error: any) {
      await connection.rollback();
      return { success: false, error: error.message };
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
    } catch (error: any) {
      await connection.rollback();
      return { success: false, error: error.message };
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
    } catch (error: any) {
      await connection.rollback();
      return { success: false, error: error.message };
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
    } catch (error: any) {
      await connection.rollback();
      return { success: false, error: error.message };
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
      const [result] = await pool.query<any>(
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
    } catch (error: any) {
      return { success: false, error: error.message };
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
      const [result] = await pool.query<any>(
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
    } catch (error: any) {
      return { success: false, error: error.message };
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
      const [result] = await pool.query<any>(
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
    } catch (error: any) {
      return { success: false, error: error.message };
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
  }): Promise<{ success: boolean; gameId?: string; error?: string }> {
    try {
      const [result] = await pool.query<any>(
        `INSERT INTO games (lesson_id, slug, title, description, order_num, path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.lesson_id,
          data.slug,
          data.title,
          data.description || "",
          data.order_num,
          data.path || null,
        ],
      );
      return { success: true, gameId: result.insertId.toString() };
    } catch (error: any) {
      return { success: false, error: error.message };
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
      ORDER BY c.title, t.order_num, l.order_num, g.order_num
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
      ORDER BY c.title
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
      ORDER BY c.title
    `,
      [userId],
    );
    return rows as Course[];
  },
};

// ============================================================
// LESSON SESSION (Quick submit for in-class ranking)
// ============================================================

export interface LessonSession {
  id: number;
  lesson_id: number;
  game_id: number;
  lesson_title?: string;
  game_title?: string;
  game_path?: string;
  session_code: string;
  created_by: number;
  is_active: boolean;
  expires_at: Date;
  created_at: Date;
}

export interface SessionSubmission {
  id: number;
  session_id: number;
  user_id: number;
  username?: string;
  full_name?: string;
  code: string;
  score: number;
  is_correct: boolean;
  execution_time: number | null;
  submitted_at: Date;
  rank_position?: number;
}

export const LessonSessionService = {
  async createSession(
    lessonId: number,
    gameId: number,
    createdBy: number,
    durationMinutes: number = 30,
  ): Promise<LessonSession> {
    const sessionCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const [result] = await pool.query<RowDataPacket[]>(
      `
      INSERT INTO lesson_sessions (lesson_id, game_id, session_code, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
      [lessonId, gameId, sessionCode, createdBy, expiresAt],
    );

    return {
      id: (result as unknown as { insertId: number }).insertId,
      lesson_id: lessonId,
      game_id: gameId,
      session_code: sessionCode,
      created_by: createdBy,
      is_active: true,
      expires_at: expiresAt,
      created_at: new Date(),
    };
  },

  async getActiveSession(lessonId: number): Promise<LessonSession | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT ls.*, l.title as lesson_title, g.title as game_title, g.game_path
      FROM lesson_sessions ls
      JOIN lessons l ON l.id = ls.lesson_id
      LEFT JOIN games g ON g.id = ls.game_id
      WHERE ls.lesson_id = ? AND ls.expires_at > NOW() AND ls.is_active = TRUE
      ORDER BY ls.created_at DESC
      LIMIT 1
    `,
      [lessonId],
    );
    return rows.length > 0 ? (rows[0] as LessonSession) : null;
  },

  async getSessionByCode(sessionCode: string): Promise<LessonSession | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT ls.*, l.title as lesson_title, g.title as game_title, g.game_path
      FROM lesson_sessions ls
      JOIN lessons l ON l.id = ls.lesson_id
      LEFT JOIN games g ON g.id = ls.game_id
      WHERE ls.session_code = ? AND ls.expires_at > NOW() AND ls.is_active = TRUE
    `,
      [sessionCode],
    );
    return rows.length > 0 ? (rows[0] as LessonSession) : null;
  },

  async submitToSession(
    sessionId: number,
    userId: number,
    data: {
      code: string;
      score: number;
      isCorrect: boolean;
      executionTime?: number;
    },
  ): Promise<SessionSubmission[]> {
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id, score FROM session_submissions WHERE session_id = ? AND user_id = ?",
      [sessionId, userId],
    );

    if (existing.length > 0) {
      if (data.score > existing[0].score) {
        await pool.query(
          `
          UPDATE session_submissions 
          SET code = ?, score = ?, is_correct = ?, execution_time = ?, submitted_at = NOW()
          WHERE session_id = ? AND user_id = ?
        `,
          [
            data.code,
            data.score,
            data.isCorrect,
            data.executionTime || null,
            sessionId,
            userId,
          ],
        );
      }
    } else {
      await pool.query(
        `
        INSERT INTO session_submissions (session_id, user_id, code, score, is_correct, execution_time)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          sessionId,
          userId,
          data.code,
          data.score,
          data.isCorrect,
          data.executionTime || null,
        ],
      );
    }

    return this.getSessionRankings(sessionId);
  },

  async getSessionRankings(sessionId: number): Promise<SessionSubmission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        ss.*,
        u.username,
        u.full_name,
        RANK() OVER (ORDER BY ss.score DESC, ss.submitted_at ASC) as rank_position
      FROM session_submissions ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.session_id = ?
      ORDER BY ss.score DESC, ss.submitted_at ASC
    `,
      [sessionId],
    );
    return rows as SessionSubmission[];
  },

  async closeSession(sessionId: number): Promise<void> {
    await pool.query(
      "UPDATE lesson_sessions SET is_active = FALSE WHERE id = ?",
      [sessionId],
    );
  },

  async getTeacherSessions(teacherId: number): Promise<LessonSession[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT ls.*, l.title as lesson_title, g.title as game_title,
             (SELECT COUNT(*) FROM session_submissions WHERE session_id = ls.id) as submission_count
      FROM lesson_sessions ls
      JOIN lessons l ON l.id = ls.lesson_id
      LEFT JOIN games g ON g.id = ls.game_id
      WHERE ls.created_by = ?
      ORDER BY ls.created_at DESC
      LIMIT 50
    `,
      [teacherId],
    );
    return rows as LessonSession[];
  },
};

export default CourseService;
