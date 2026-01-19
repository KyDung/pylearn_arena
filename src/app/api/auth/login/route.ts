import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username và password là bắt buộc" },
        { status: 400 },
      );
    }

    // Query user từ database
    const [rows] = (await pool.query(
      "SELECT id, username, password, full_name, role FROM users WHERE username = ?",
      [username],
    )) as any;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    // Tạo response với user info (không trả password)
    const userInfo = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
    };

    // Tạo response và set cookie
    const response = NextResponse.json({
      success: true,
      user: userInfo,
    });

    // Set cookie để lưu session
    response.cookies.set("auth-token", JSON.stringify(userInfo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi đăng nhập" },
      { status: 500 },
    );
  }
}
