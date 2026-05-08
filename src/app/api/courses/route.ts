import { NextResponse, NextRequest } from "next/server";
import { CourseService } from "@/lib/services";
import { getCurrentUser } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    // Luôn trả về tất cả khóa học published - phân quyền sẽ xử lý ở các trang chi tiết
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
