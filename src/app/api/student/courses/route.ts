import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import type { User } from "@/types";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import SessionService from "@/lib/services/sessions";
// import ContestService from "@/lib/services/contests-new"; // ẨN CONTESTS

// GET /api/student/courses - Lấy danh sách khóa học được phép truy cập + Virtual courses
export const GET = withAuth(
  async (
    request: NextRequest,
    context: { params?: Record<string, string>; user: User },
  ) => {
    try {
      const { user } = context;
      console.log(
        "🔍 Student courses API - User:",
        user.id,
        user.username,
        user.role,
      );

      // Lấy danh sách khóa học mà student được truy cập thông qua lớp
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT 
           c.id,
           c.title,
           c.description,
           c.slug,
           c.thumbnail as image_url,
           c.difficulty as difficulty_level,
           NULL as estimated_duration,
           NULL as tags,
           ca.granted_at,
           cl.name as class_name
         FROM courses c
         INNER JOIN course_access ca ON c.id = ca.course_id
         INNER JOIN classes cl ON ca.class_id = cl.id
         INNER JOIN class_members cm ON cl.id = cm.class_id
         WHERE cm.user_id = ? 
           AND cm.status = 'active'
           AND c.is_published = 1
         ORDER BY ca.granted_at DESC, c.title ASC`,
        [user.id],
      );
      console.log("📚 Found courses:", rows.length);

      // Lấy active sessions - với error handling
      let activeSessions = [];
      try {
        activeSessions = await SessionService.getActiveSessionsForStudent(
          user.id,
        );
        console.log("📝 Active sessions:", activeSessions.length);
      } catch (sessionError: any) {
        console.error(
          "❌ Error fetching active sessions:",
          sessionError.message,
        );
        // Continue anyway - just no sessions
      }

      // *** ẨN CONTESTS - Chỉ dùng Sessions ***
      // Lấy ongoing contests
      // const ongoingContests = await ContestService.getOngoingContestsForStudent(
      //   user.id,
      // );

      // LUÔN tạo virtual course "Sessions" - dù có session hay không
      const virtualCourses = [];

      // Virtual Course: Sessions - LUÔN hiển thị
      virtualCourses.push({
        id: "virtual-sessions",
        title: "📝 Bài kiểm tra đang mở",
        description:
          activeSessions.length > 0
            ? `Có ${activeSessions.length} bài kiểm tra đang diễn ra`
            : "Chưa có bài kiểm tra nào",
        slug: "sessions",
        image_url: null,
        difficulty_level: null,
        estimated_duration: null,
        tags: null,
        granted_at: new Date(),
        class_name: "Virtual",
        is_virtual: true,
        type: "sessions",
        count: activeSessions.length,
      });

      // *** ẨN CONTESTS ***
      // if (ongoingContests.length > 0) {
      //   virtualCourses.push({
      //     id: "virtual-contests",
      //     title: "🏆 Cuộc thi",
      //     description: `Có ${ongoingContests.length} cuộc thi đang diễn ra`,
      //     slug: "contests",
      //     image_url: null,
      //     difficulty_level: null,
      //     estimated_duration: null,
      //     tags: null,
      //     granted_at: new Date(),
      //     class_name: "Virtual",
      //     is_virtual: true,
      //     type: "contests",
      //     count: ongoingContests.length,
      //   });
      // }

      // Combine: Virtual courses ở đầu, regular courses sau
      const allCourses = [...virtualCourses, ...rows];

      return successResponse(allCourses);
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  },
  ["student"],
);
