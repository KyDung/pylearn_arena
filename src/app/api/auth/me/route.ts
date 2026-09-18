import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    const userInfo = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return NextResponse.json({ success: true, user: userInfo });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
