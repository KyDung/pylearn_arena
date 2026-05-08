import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import { LessonService } from "@/lib/services/courses";

// GET /api/admin/lessons/[id] - Get lesson details
export const GET = withAuth(
  async (request: NextRequest, { params }) => {
    const lessonId = params?.id;
    if (!lessonId) return errorResponse("Invalid lesson ID");

    const lesson = await LessonService.getLessonById(lessonId);
    if (!lesson) return notFoundResponse("Lesson not found");

    return successResponse(lesson);
  },
  ["admin"],
);

// PUT /api/admin/lessons/[id] - Update lesson
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    const lessonId = params?.id;
    if (!lessonId) return errorResponse("Invalid lesson ID");

    const body = await request.json();
    const { title, description, summary, order_num } = body;

    const updated = await LessonService.updateLesson(lessonId, {
      title,
      description,
      summary,
      order_num,
    });

    if (!updated) return notFoundResponse("Lesson not found or no changes");

    return successResponse(updated, "Lesson updated successfully");
  },
  ["admin"],
);
