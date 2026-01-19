import { NextResponse } from "next/server";
import { CourseService } from "@/lib/services";

export async function GET() {
  try {
    const courses = await CourseService.getPublishedCourses();

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
