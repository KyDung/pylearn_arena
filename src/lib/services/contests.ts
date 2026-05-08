/**
 * 🏆 Contest Service - Quản lý cuộc thi
 *
 * Hệ thống cho phép Admin/Teacher:
 * 1. Tạo cuộc thi → chọn lớp → chọn khóa học/bài học
 * 2. Mở tất cả game trong bài hoặc chọn từng game
 * 3. Học sinh chỉ thấy nút "Nộp code" khi game được mở cuộc thi
 */
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "@/lib/dbTypes";

// ============================================================
// INTERFACES
// ============================================================

export interface Contest {
  id: number;
  title: string;
  description: string;
  contest_code: string;
  created_by: number;
  creator_name?: string;
  class_id: number | null;
  class_name?: string;
  course_id: number | null;
  course_title?: string;
  lesson_id: number | null;
  lesson_title?: string;
  open_all_games: boolean;
  status: "draft" | "active" | "closed";
  start_time: Date | null;
  end_time: Date | null;
  show_ranking: boolean;
  allow_resubmit: boolean;
  max_attempts: number | null;
  created_at: Date;
  updated_at: Date;
  game_count?: number;
  submission_count?: number;
}

export interface ContestGame {
  id: number;
  contest_id: number;
  game_id: number;
  game_title?: string;
  game_path?: string;
  game_type?: string;
  lesson_title?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ContestSubmission {
  id: number;
  contest_id: number;
  game_id: number;
  game_title?: string;
  user_id: number;
  username?: string;
  full_name?: string;
  code: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  is_correct: boolean;
  execution_time: number | null;
  attempt_number: number;
  submitted_at: Date;
  rank_position?: number;
}

export interface ContestRanking {
  user_id: number;
  username: string;
  full_name: string;
  total_score: number;
  games_completed: number;
  total_games: number;
  best_submission_time: Date;
  rank_position?: number;
}

// ============================================================
// CONTEST SERVICE
// ============================================================

export const ContestService = {
  /**
   * Tạo cuộc thi mới
   */
  async createContest(data: {
    title: string;
    description?: string;
    createdBy: number;
    classId?: number;
    courseId?: number;
    lessonId?: number;
    openAllGames?: boolean;
    startTime?: Date;
    endTime?: Date;
    showRanking?: boolean;
    allowResubmit?: boolean;
    maxAttempts?: number;
  }): Promise<Contest> {
    // Tạo mã cuộc thi ngẫu nhiên
    const contestCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contests 
        (title, description, contest_code, created_by, class_id, course_id, lesson_id, 
         open_all_games, start_time, end_time, show_ranking, allow_resubmit, max_attempts, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        data.title,
        data.description || null,
        contestCode,
        data.createdBy,
        data.classId || null,
        data.courseId || null,
        data.lessonId || null,
        data.openAllGames || false,
        data.startTime || null,
        data.endTime || null,
        data.showRanking !== false,
        data.allowResubmit !== false,
        data.maxAttempts || null,
      ],
    );

    const contest = await this.getContestById(result.insertId);
    return contest!;
  },

  /**
   * Lấy cuộc thi theo ID
   */
  async getContestById(contestId: number): Promise<Contest | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              u.full_name as creator_name,
              cl.name as class_name,
              co.title as course_title,
              l.title as lesson_title,
              (SELECT COUNT(*) FROM contest_games WHERE contest_id = c.id AND is_active = TRUE) as game_count,
              (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = c.id) as submission_count
       FROM contests c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN courses co ON co.id = c.course_id
       LEFT JOIN lessons l ON l.id = c.lesson_id
       WHERE c.id = ?`,
      [contestId],
    );
    return rows.length > 0 ? (rows[0] as Contest) : null;
  },

  /**
   * Lấy cuộc thi theo mã code
   */
  async getContestByCode(contestCode: string): Promise<Contest | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              u.full_name as creator_name,
              cl.name as class_name,
              co.title as course_title,
              l.title as lesson_title
       FROM contests c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN courses co ON co.id = c.course_id
       LEFT JOIN lessons l ON l.id = c.lesson_id
       WHERE c.contest_code = ?`,
      [contestCode],
    );
    return rows.length > 0 ? (rows[0] as Contest) : null;
  },

  /**
   * Lấy danh sách cuộc thi của teacher/admin
   */
  async getContestsByCreator(creatorId: number): Promise<Contest[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              u.full_name as creator_name,
              cl.name as class_name,
              co.title as course_title,
              l.title as lesson_title,
              (SELECT COUNT(*) FROM contest_games WHERE contest_id = c.id AND is_active = TRUE) as game_count,
              (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = c.id) as submission_count
       FROM contests c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN courses co ON co.id = c.course_id
       LEFT JOIN lessons l ON l.id = c.lesson_id
       WHERE c.created_by = ?
       ORDER BY c.created_at DESC`,
      [creatorId],
    );
    return rows as Contest[];
  },

  /**
   * Lấy tất cả cuộc thi (cho admin)
   */
  async getAllContests(): Promise<Contest[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              u.full_name as creator_name,
              cl.name as class_name,
              co.title as course_title,
              l.title as lesson_title,
              (SELECT COUNT(*) FROM contest_games WHERE contest_id = c.id AND is_active = TRUE) as game_count,
              (SELECT COUNT(*) FROM contest_submissions WHERE contest_id = c.id) as submission_count
       FROM contests c
       LEFT JOIN users u ON u.id = c.created_by
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN courses co ON co.id = c.course_id
       LEFT JOIN lessons l ON l.id = c.lesson_id
       ORDER BY c.created_at DESC`,
    );
    return rows as Contest[];
  },

  /**
   * Cập nhật cuộc thi
   */
  async updateContest(
    contestId: number,
    data: Partial<{
      title: string;
      description: string;
      classId: number;
      courseId: number;
      lessonId: number;
      openAllGames: boolean;
      status: "draft" | "active" | "closed";
      startTime: Date;
      endTime: Date;
      showRanking: boolean;
      allowResubmit: boolean;
      maxAttempts: number;
    }>,
  ): Promise<Contest | null> {
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description);
    }
    if (data.classId !== undefined) {
      fields.push("class_id = ?");
      values.push(data.classId);
    }
    if (data.courseId !== undefined) {
      fields.push("course_id = ?");
      values.push(data.courseId);
    }
    if (data.lessonId !== undefined) {
      fields.push("lesson_id = ?");
      values.push(data.lessonId);
    }
    if (data.openAllGames !== undefined) {
      fields.push("open_all_games = ?");
      values.push(data.openAllGames);
    }
    if (data.status !== undefined) {
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.startTime !== undefined) {
      fields.push("start_time = ?");
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      fields.push("end_time = ?");
      values.push(data.endTime);
    }
    if (data.showRanking !== undefined) {
      fields.push("show_ranking = ?");
      values.push(data.showRanking);
    }
    if (data.allowResubmit !== undefined) {
      fields.push("allow_resubmit = ?");
      values.push(data.allowResubmit);
    }
    if (data.maxAttempts !== undefined) {
      fields.push("max_attempts = ?");
      values.push(data.maxAttempts);
    }

    if (fields.length === 0) return null;

    await pool.query(
      `UPDATE contests SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      [...values, contestId],
    );

    return this.getContestById(contestId);
  },

  /**
   * Mở cuộc thi (chuyển sang active)
   */
  async activateContest(contestId: number): Promise<Contest | null> {
    return this.updateContest(contestId, { status: "active" });
  },

  /**
   * Đóng cuộc thi
   */
  async closeContest(contestId: number): Promise<Contest | null> {
    return this.updateContest(contestId, { status: "closed" });
  },

  /**
   * Xóa cuộc thi
   */
  async deleteContest(contestId: number): Promise<void> {
    await pool.query("DELETE FROM contests WHERE id = ?", [contestId]);
  },

  /**
   * Kiểm tra cuộc thi có đang active và trong thời gian không
   */
  async isContestActive(contestId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM contests 
       WHERE id = ? AND status = 'active'
       AND (start_time IS NULL OR start_time <= NOW())
       AND (end_time IS NULL OR end_time > NOW())`,
      [contestId],
    );
    return rows.length > 0;
  },
};

// ============================================================
// CONTEST GAME SERVICE
// ============================================================

export const ContestGameService = {
  /**
   * Thêm game vào cuộc thi
   */
  async addGameToContest(
    contestId: number,
    gameId: number,
    sortOrder?: number,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO contest_games (contest_id, game_id, sort_order, is_active)
       VALUES (?, ?, ?, TRUE)
       ON CONFLICT (contest_id, game_id) DO UPDATE SET
         is_active = TRUE,
         sort_order = EXCLUDED.sort_order`,
      [contestId, gameId, sortOrder || 0],
    );
  },

  /**
   * Thêm tất cả game của bài học vào cuộc thi
   */
  async addAllLessonGames(contestId: number, lessonId: number): Promise<void> {
    const [games] = await pool.query<RowDataPacket[]>(
      "SELECT id, order_num as sort_order FROM games WHERE lesson_id = ? AND is_active = TRUE ORDER BY order_num",
      [lessonId],
    );

    for (const game of games) {
      await this.addGameToContest(contestId, game.id, game.sort_order);
    }
  },

  /**
   * Xóa game khỏi cuộc thi
   */
  async removeGameFromContest(
    contestId: number,
    gameId: number,
  ): Promise<void> {
    await pool.query(
      "UPDATE contest_games SET is_active = FALSE WHERE contest_id = ? AND game_id = ?",
      [contestId, gameId],
    );
  },

  /**
   * Lấy danh sách game trong cuộc thi
   */
  async getContestGames(contestId: number): Promise<ContestGame[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT cg.*, g.title as game_title, g.game_path, g.game_type, l.title as lesson_title
       FROM contest_games cg
       JOIN games g ON g.id = cg.game_id
       LEFT JOIN lessons l ON l.id = g.lesson_id
       WHERE cg.contest_id = ? AND cg.is_active = TRUE
       ORDER BY cg.sort_order, g.title`,
      [contestId],
    );
    return rows as ContestGame[];
  },

  /**
   * Kiểm tra game có đang được mở cuộc thi không (quan trọng nhất)
   */
  async isGameInActiveContest(
    gameId: number,
    userId?: number,
  ): Promise<{
    isInContest: boolean;
    contest: Contest | null;
  }> {
    // Tìm cuộc thi active có game này
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.* FROM contests c
       JOIN contest_games cg ON cg.contest_id = c.id
       WHERE cg.game_id = ? 
         AND cg.is_active = TRUE
         AND c.status = 'active'
         AND (c.start_time IS NULL OR c.start_time <= NOW())
         AND (c.end_time IS NULL OR c.end_time > NOW())
       LIMIT 1`,
      [gameId],
    );

    if (rows.length === 0) {
      return { isInContest: false, contest: null };
    }

    const contest = rows[0] as Contest;

    // Nếu cuộc thi giới hạn theo lớp, kiểm tra user có trong lớp không
    if (contest.class_id && userId) {
      const [memberCheck] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM class_members 
         WHERE class_id = ? AND user_id = ? AND status = 'active'`,
        [contest.class_id, userId],
      );
      if (memberCheck.length === 0) {
        return { isInContest: false, contest: null };
      }
    }

    return { isInContest: true, contest };
  },

  /**
   * Lấy danh sách cuộc thi active mà game đang tham gia
   */
  async getActiveContestsForGame(gameId: number): Promise<Contest[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, cl.name as class_name
       FROM contests c
       JOIN contest_games cg ON cg.contest_id = c.id
       LEFT JOIN classes cl ON cl.id = c.class_id
       WHERE cg.game_id = ? 
         AND cg.is_active = TRUE
         AND c.status = 'active'
         AND (c.start_time IS NULL OR c.start_time <= NOW())
         AND (c.end_time IS NULL OR c.end_time > NOW())`,
      [gameId],
    );
    return rows as Contest[];
  },
};

// ============================================================
// CONTEST SUBMISSION SERVICE
// ============================================================

export const ContestSubmissionService = {
  /**
   * Nộp bài vào cuộc thi
   */
  async submitToContest(
    contestId: number,
    gameId: number,
    userId: number,
    data: {
      code: string;
      score: number;
      passedTests: number;
      totalTests: number;
      isCorrect: boolean;
      executionTime?: number;
    },
  ): Promise<ContestSubmission> {
    // Lấy thông tin cuộc thi
    const contest = await ContestService.getContestById(contestId);
    if (!contest) {
      throw new Error("Cuộc thi không tồn tại");
    }

    // Kiểm tra cuộc thi còn active không
    const isActive = await ContestService.isContestActive(contestId);
    if (!isActive) {
      throw new Error("Cuộc thi đã kết thúc hoặc chưa bắt đầu");
    }

    // Đếm số lần nộp
    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM contest_submissions WHERE contest_id = ? AND game_id = ? AND user_id = ?",
      [contestId, gameId, userId],
    );
    const attemptNumber = countResult[0].count + 1;

    // Kiểm tra giới hạn số lần nộp
    if (contest.max_attempts && attemptNumber > contest.max_attempts) {
      throw new Error(`Đã hết lượt nộp (tối đa ${contest.max_attempts} lần)`);
    }

    // Kiểm tra cho phép nộp lại không
    if (!contest.allow_resubmit && attemptNumber > 1) {
      throw new Error("Cuộc thi không cho phép nộp lại");
    }

    // Lưu submission
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contest_submissions 
        (contest_id, game_id, user_id, code, score, passed_tests, total_tests, is_correct, execution_time, attempt_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contestId,
        gameId,
        userId,
        data.code,
        data.score,
        data.passedTests,
        data.totalTests,
        data.isCorrect,
        data.executionTime || null,
        attemptNumber,
      ],
    );

    const [submission] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM contest_submissions WHERE id = ?",
      [result.insertId],
    );

    return submission[0] as ContestSubmission;
  },

  /**
   * Lấy bài nộp tốt nhất của user cho 1 game trong cuộc thi
   */
  async getBestSubmission(
    contestId: number,
    gameId: number,
    userId: number,
  ): Promise<ContestSubmission | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM contest_submissions 
       WHERE contest_id = ? AND game_id = ? AND user_id = ?
       ORDER BY score DESC, submitted_at ASC
       LIMIT 1`,
      [contestId, gameId, userId],
    );
    return rows.length > 0 ? (rows[0] as ContestSubmission) : null;
  },

  /**
   * Lấy tất cả submissions của user trong cuộc thi
   */
  async getUserSubmissions(
    contestId: number,
    userId: number,
  ): Promise<ContestSubmission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT cs.*, g.title as game_title
       FROM contest_submissions cs
       JOIN games g ON g.id = cs.game_id
       WHERE cs.contest_id = ? AND cs.user_id = ?
       ORDER BY cs.submitted_at DESC`,
      [contestId, userId],
    );
    return rows as ContestSubmission[];
  },

  /**
   * Lấy bảng xếp hạng cuộc thi (theo tổng điểm các game)
   */
  async getContestRankings(contestId: number): Promise<ContestRanking[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         u.id as user_id,
         u.username,
         u.full_name,
         SUM(best.max_score) as total_score,
         COUNT(DISTINCT best.game_id) as games_completed,
         (SELECT COUNT(*) FROM contest_games WHERE contest_id = ? AND is_active = TRUE) as total_games,
         MIN(best.first_submit) as best_submission_time,
         RANK() OVER (ORDER BY SUM(best.max_score) DESC, MIN(best.first_submit) ASC) as rank_position
       FROM users u
       JOIN (
         SELECT user_id, game_id, MAX(score) as max_score, MIN(submitted_at) as first_submit
         FROM contest_submissions
         WHERE contest_id = ?
         GROUP BY user_id, game_id
       ) best ON best.user_id = u.id
       GROUP BY u.id, u.username, u.full_name
       ORDER BY total_score DESC, best_submission_time ASC`,
      [contestId, contestId],
    );
    return rows as ContestRanking[];
  },

  /**
   * Lấy bảng xếp hạng cho 1 game trong cuộc thi
   */
  async getGameRankings(
    contestId: number,
    gameId: number,
  ): Promise<ContestSubmission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         cs.*,
         u.username,
         u.full_name,
         RANK() OVER (ORDER BY cs.score DESC, cs.submitted_at ASC) as rank_position
       FROM contest_submissions cs
       JOIN users u ON u.id = cs.user_id
       WHERE cs.contest_id = ? AND cs.game_id = ?
         AND cs.id IN (
           SELECT MAX(id) FROM contest_submissions 
           WHERE contest_id = ? AND game_id = ?
           GROUP BY user_id
         )
       ORDER BY cs.score DESC, cs.submitted_at ASC`,
      [contestId, gameId, contestId, gameId],
    );
    return rows as ContestSubmission[];
  },

  /**
   * Lấy tất cả submissions của cuộc thi (cho admin/teacher)
   */
  async getAllSubmissions(contestId: number): Promise<ContestSubmission[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT cs.*, u.username, u.full_name, g.title as game_title
       FROM contest_submissions cs
       JOIN users u ON u.id = cs.user_id
       JOIN games g ON g.id = cs.game_id
       WHERE cs.contest_id = ?
       ORDER BY cs.submitted_at DESC`,
      [contestId],
    );
    return rows as ContestSubmission[];
  },
};

export default ContestService;
