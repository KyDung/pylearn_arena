import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Xóa cookies
  response.cookies.delete("auth-token");
  response.cookies.delete("user-info");

  return response;
}
