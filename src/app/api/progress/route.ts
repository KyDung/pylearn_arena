import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { cookies } from "next/headers";

// GET - Lấy tiến độ học tập của user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token");

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = JSON.parse(authToken.value);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    let query = `
      SELECT up.*, g.title as game_title, g.slug as game_slug,
             l.title as lesson_title, l.slug as lesson_slug
      FROM user_progress up
      INNER JOIN games g ON up.game_id = g.id
      INNER JOIN lessons l ON g.lesson_id = l.id
      WHERE up.user_id = ?
    `;
    const params: any[] = [user.id];

    if (courseId) {
      query += ` AND l.topic_id IN (
        SELECT id FROM topics WHERE course_id = (
          SELECT id FROM courses WHERE slug = ?
        )
      )`;
      params.push(courseId);
    }

    query += " ORDER BY up.last_attempt_at DESC";

    const [rows] = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      progress: rows,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}
