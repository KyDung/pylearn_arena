import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/authToken";
import { getUserWithPassword } from "@/lib/services/users";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return NextResponse.json(
        { error: "Username và password là bắt buộc" },
        { status: 400 },
      );
    }

    const user = await getUserWithPassword(username);
    if (!user) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Tài khoản đã bị khóa" }, { status: 403 });
    }

    // Tạo response với user info (không trả password)
    const userInfo = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    // Create JWT token
    const token = createToken(
      { userId: user.id, username: user.username, role: user.role },
    );

    // Tạo response và set cookie
    const response = NextResponse.json({
      success: true,
      user: userInfo,
    });

    // Set JWT cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Also set user info cookie for client-side access
    response.cookies.set("user-info", JSON.stringify(userInfo), {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
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
