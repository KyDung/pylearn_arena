import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { RowDataPacket } from "@/lib/dbTypes";

// GET /api/games/info?path=python-basics/chapter-1/t10-cd-b12/id1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 },
      );
    }

    // Query game info from database with joins to get full context
    const query = `
      SELECT 
        g.id as game_id,
        g.slug as game_slug,
        g.title as game_title,
        g.description as game_description,
        g.path as game_path,
        g.order_num as game_order,
        l.id as lesson_id,
        l.slug as lesson_slug,
        l.title as lesson_title,
        l.description as lesson_description,
        t.id as topic_id,
        t.slug as topic_slug,
        t.title as topic_title,
        t.description as topic_description,
        c.id as course_id,
        c.slug as course_slug,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail as course_thumbnail,
        c.difficulty as course_difficulty
      FROM games g
      JOIN lessons l ON g.lesson_id = l.id
      JOIN topics t ON l.topic_id = t.id
      JOIN courses c ON t.course_id = c.id
      WHERE g.path = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [path]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Game not found", path },
        { status: 404 },
      );
    }

    const row = rows[0];

    // Format response
    const gameInfo = {
      game: {
        id: row.game_id,
        slug: row.game_slug,
        title: row.game_title,
        description: row.game_description,
        path: row.game_path,
        order: row.game_order,
      },
      lesson: {
        id: row.lesson_id,
        slug: row.lesson_slug,
        title: row.lesson_title,
        description: row.lesson_description,
      },
      topic: {
        id: row.topic_id,
        slug: row.topic_slug,
        title: row.topic_title,
        description: row.topic_description,
      },
      course: {
        id: row.course_id,
        slug: row.course_slug,
        title: row.course_title,
        description: row.course_description,
        thumbnail: row.course_thumbnail,
        difficulty: row.course_difficulty,
      },
    };

    return NextResponse.json({
      success: true,
      data: gameInfo,
    });
  } catch (error: any) {
    console.error("Error fetching game info:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
