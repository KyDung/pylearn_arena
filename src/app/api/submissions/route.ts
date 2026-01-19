import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { cookies } from "next/headers";

// POST - Nộp bài
export async function POST(request: NextRequest) {
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
    const { gameId, code, status, score } = await request.json();

    if (!gameId || !code) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Insert submission
    const [result] = (await pool.query(
      `INSERT INTO submissions (user_id, game_id, code, status, score) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, gameId, code, status || "completed", score || 0],
    )) as any;

    // Update user progress
    await pool.query(
      `INSERT INTO user_progress (user_id, game_id, is_completed, score, attempts, last_attempt_at)
       VALUES (?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE 
         score = GREATEST(score, ?),
         attempts = attempts + 1,
         last_attempt_at = NOW(),
         is_completed = ?,
         completed_at = IF(? = 1 AND completed_at IS NULL, NOW(), completed_at)`,
      [
        user.id,
        gameId,
        score || 0,
        score || 0,
        status === "completed" ? 1 : 0,
        status === "completed" ? 1 : 0,
      ],
    );

    return NextResponse.json({
      success: true,
      submissionId: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit" },
      { status: 500 },
    );
  }
}

// GET - Lấy danh sách submissions
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
    const gameId = searchParams.get("gameId");

    let query = `
      SELECT s.id, s.game_id, s.code, s.status, s.score, s.feedback, s.submitted_at,
             g.title as game_title
      FROM submissions s
      INNER JOIN games g ON s.game_id = g.id
      WHERE s.user_id = ?
    `;
    const params: any[] = [user.id];

    if (gameId) {
      query += " AND s.game_id = ?";
      params.push(gameId);
    }

    query += " ORDER BY s.submitted_at DESC";

    const [rows] = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      submissions: rows,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
