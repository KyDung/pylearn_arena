import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { getUserStats } from "@/lib/services/users";

import { getErrorMessage } from "@/lib/errors";
export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const stats = await getUserStats();
    return successResponse(stats);
  } catch (error) {
    return errorResponse(getErrorMessage(error));
  }
}, ["admin"]);
