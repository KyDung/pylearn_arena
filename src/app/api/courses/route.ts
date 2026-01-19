import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, title, description, difficulty, is_published, created_at, updated_at 
       FROM courses 
       WHERE is_published = true
       ORDER BY created_at ASC`,
    );

    return NextResponse.json({
      success: true,
      courses: rows,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
