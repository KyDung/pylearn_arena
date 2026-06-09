import { NextResponse, NextRequest } from "next/server";
import { CourseService } from "@/lib/services";
import { getCurrentUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    // Admins see all courses (including unpublished); others only see published
    const courses =
      user?.role === "admin"
        ? await CourseService.getAllCourses()
        : await CourseService.getPublishedCourses();

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
