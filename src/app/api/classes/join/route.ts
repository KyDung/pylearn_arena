import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { joinClassByCode } from "@/lib/services/classes";

// POST /api/classes/join - Tham gia lớp bằng mã
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return errorResponse("Mã lớp là bắt buộc");
  }

  const result = await joinClassByCode(code.toUpperCase(), user.id);

  if (!result.success) {
    return errorResponse(result.error || "Không thể tham gia lớp");
  }

  return successResponse(result.class, "Đã tham gia lớp thành công");
}, "authenticated");
