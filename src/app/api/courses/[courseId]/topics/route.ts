import { NextResponse } from "next/server";
import { CourseService, TopicService } from "@/lib/services";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;

  try {
    // Get course by slug
    const course = await CourseService.getCourseBySlug(courseId);

    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    // Get topics with lessons count
    const topics = await TopicService.getTopicsByCourseId(course.id);

    return NextResponse.json({
      success: true,
      topics,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch topics" },
      { status: 500 },
    );
  }
}
