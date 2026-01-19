import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  const { courseId, lessonId } = await context.params;

  try {
    // Get lesson by slug
    const [lessonRows] = (await pool.query(
      "SELECT id FROM lessons WHERE slug = ?",
      [lessonId],
    )) as any;

    if (!lessonRows || lessonRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    const dbLessonId = lessonRows[0].id;

    const [rows] = await pool.query(
      `SELECT id, lesson_id, slug, title, description, path, order_num, created_at, updated_at
       FROM games 
       WHERE lesson_id = ?
       ORDER BY order_num ASC`,
      [dbLessonId],
    );

    return NextResponse.json({
      success: true,
      games: rows,
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch games" },
      { status: 500 },
    );
  }
}
