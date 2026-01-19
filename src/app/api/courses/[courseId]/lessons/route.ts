import { NextResponse } from "next/server";
import { LessonService } from "@/lib/services";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await context.params;

  try {
    const lessons = await LessonService.getLessonsByCourseSlug(courseId);

    if (lessons.length === 0) {
      // Có thể course không tồn tại hoặc không có lessons
      // Trả về mảng rỗng thay vì lỗi
    }

    return NextResponse.json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lessons" },
      { status: 500 },
    );
  }
}
