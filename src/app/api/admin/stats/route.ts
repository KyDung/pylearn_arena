import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { getUserStats } from "@/lib/services/users";

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const stats = await getUserStats();
    return successResponse(stats);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}, ["admin"]);
