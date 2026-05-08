import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

const JWT_SECRET =
  process.env.JWT_SECRET || "pylearn-secret-key-change-in-production";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth-token");

    if (!authToken) {
      return NextResponse.json({ success: false, user: null });
    }

    // Decode JWT token
    const decoded = jwt.verify(authToken.value, JWT_SECRET) as any;

    // Get full user info from database
    const [rows] = (await pool.query(
      "SELECT id, username, full_name, email, role FROM users WHERE id = ?",
      [decoded.userId],
    )) as any;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, user: null });
    }

    const user = rows[0];
    const userInfo = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    };

    return NextResponse.json({ success: true, user: userInfo });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ success: false, user: null });
  }
}
