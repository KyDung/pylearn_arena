import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import { getUsers } from "@/lib/services/users";
import type { UserRole } from "@/types";

export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");
    const role = roleParam ? (roleParam as UserRole) : undefined;

    const users = await getUsers({ role });
    return successResponse(users);
  },
  ["admin", "teacher"],
);
