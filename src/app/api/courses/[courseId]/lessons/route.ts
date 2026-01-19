import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;

  try {
    // Get course by slug
    const [courseRows] = (await pool.query(
      "SELECT id FROM courses WHERE slug = ?",
      [courseId],
    )) as any;

    if (!courseRows || courseRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const dbCourseId = courseRows[0].id;

    const [rows] = await pool.query(
      `SELECT l.id, l.topic_id, l.slug, l.title, l.description, l.summary, l.order_num, l.created_at, l.updated_at
       FROM lessons l
       INNER JOIN topics t ON l.topic_id = t.id
       WHERE t.course_id = ? 
       ORDER BY l.order_num ASC`,
      [dbCourseId],
    );

    return NextResponse.json({
      success: true,
      lessons: rows,
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lessons" },
      { status: 500 },
    );
  }
}
