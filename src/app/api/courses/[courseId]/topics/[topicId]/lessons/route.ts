import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; topicId: string }> },
) {
  const { courseId, topicId } = await context.params;

  try {
    // Get topic by ID
    const [topicRows] = (await pool.query(
      "SELECT id FROM topics WHERE id = ?",
      [topicId],
    )) as any;

    if (!topicRows || topicRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Topic not found" },
        { status: 404 },
      );
    }

    const [rows] = await pool.query(
      `SELECT id, topic_id, slug, title, description, summary, order_num, created_at, updated_at
       FROM lessons 
       WHERE topic_id = ?
       ORDER BY order_num ASC`,
      [topicId],
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
