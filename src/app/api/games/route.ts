import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    // First, check which columns exist
    const [columns] = await pool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM games",
    );
    const columnNames = columns.map((c: any) => c.Field);

    // Build dynamic query based on existing columns
    const hasGameType = columnNames.includes("game_type");
    const hasGamePath = columnNames.includes("game_path");
    const hasPath = columnNames.includes("path");

    const gameTypeCol = hasGameType ? "g.game_type" : "'type1'";
    const gamePathCol = hasGamePath ? "g.game_path" : hasPath ? "g.path" : "''";

    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        g.id,
        g.title,
        ${gameTypeCol} as game_type,
        ${gamePathCol} as game_path
      FROM games g
      ORDER BY g.title
    `);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi lấy danh sách games: " + error.message },
      { status: 500 },
    );
  }
}
