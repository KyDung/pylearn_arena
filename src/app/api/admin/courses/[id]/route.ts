import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import { CourseService } from "@/lib/services/courses";

// GET /api/admin/courses/[id] - Get course details
export const GET = withAuth(
  async (request: NextRequest, { params }) => {
    const courseId = parseInt(params?.id || "0");
    if (!courseId) return errorResponse("Invalid course ID");

    const course = await CourseService.getCourseById(courseId);
    if (!course) return notFoundResponse("Course not found");

    return successResponse(course);
  },
  ["admin"],
);

// PUT /api/admin/courses/[id] - Update course
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    const courseId = parseInt(params?.id || "0");
    if (!courseId) return errorResponse("Invalid course ID");

    const body = await request.json();
    const { title, description, difficulty, is_published } = body;

    const updated = await CourseService.updateCourse(courseId, {
      title,
      description,
      difficulty,
      is_published,
    });

    if (!updated) return notFoundResponse("Course not found or no changes");

    return successResponse(updated, "Course updated successfully");
  },
  ["admin"],
);
