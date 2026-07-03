import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  const { courseId, lessonId } = await context.params;

  try {
    const isNumericCourseId = /^\d+$/.test(courseId);
    const lessonLookupParams: (string | number)[] = isNumericCourseId
      ? [courseId, Number(courseId), lessonId]
      : [courseId, lessonId];
    const courseCondition = isNumericCourseId
      ? "(c.slug = ? OR c.id = ?)"
      : "c.slug = ?";
    const lessonCondition = /^\d+$/.test(lessonId)
      ? "l.id = ?"
      : "l.slug = ?";

    const [lessonRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.id,
         l.topic_id,
         l.slug,
         l.title,
         l.description,
         l.summary,
         l.order_num
       FROM lessons l
       INNER JOIN topics t ON l.topic_id = t.id
       INNER JOIN courses c ON t.course_id = c.id
       WHERE ${courseCondition} AND ${lessonCondition}
       LIMIT 1`,
      lessonLookupParams,
    );

    if (lessonRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    const lesson = lessonRows[0];
    const dbLessonId = Number(lesson.id);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, lesson_id, slug, title, description, path, order_num, created_at, updated_at
       FROM games 
       WHERE lesson_id = ?
       ORDER BY order_num ASC`,
      [dbLessonId],
    );

    return NextResponse.json({
      success: true,
      lesson,
      data: rows,
      games: rows, // backward compatibility
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch games" },
      { status: 500 },
    );
  }
}
