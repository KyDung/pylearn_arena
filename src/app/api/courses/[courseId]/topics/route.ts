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

    // Get topics with lessons count
    const [rows] = await pool.query(
      `SELECT t.id, t.slug, t.title, t.description, t.order_num,
              COUNT(l.id) as lesson_count
       FROM topics t
       LEFT JOIN lessons l ON t.id = l.topic_id
       WHERE t.course_id = ?
       GROUP BY t.id, t.slug, t.title, t.description, t.order_num
       ORDER BY t.order_num ASC`,
      [dbCourseId],
    );

    return NextResponse.json({
      success: true,
      topics: rows,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch topics" },
      { status: 500 },
    );
  }
}
