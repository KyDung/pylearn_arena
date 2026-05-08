import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/apiAuth";
import {
  CourseService,
  TopicService,
  LessonService,
  GameService,
} from "@/lib/services/courses";

// GET /api/admin/courses - Lấy tất cả courses với cấu trúc đầy đủ
export const GET = withAuth(async () => {
  const courses = await CourseService.getAllCourses();
  return successResponse(courses);
}, ["admin"]);

// PUT /api/admin/courses - Cập nhật course/topic/lesson/game
export const PUT = withAuth(
  async (request: NextRequest) => {
    const body = await request.json();
    const { type, id, data } = body;

    if (!type || !id || !data) {
      return errorResponse("type, id và data là bắt buộc");
    }

    let result;
    switch (type) {
      case "course":
        result = await CourseService.updateCourse(id, data);
        break;
      case "topic":
        result = await TopicService.updateTopic(id, data);
        break;
      case "lesson":
        result = await LessonService.updateLesson(id, data);
        break;
      case "game":
        result = await GameService.updateGame(id, data);
        break;
      default:
        return errorResponse("type không hợp lệ (course/topic/lesson/game)");
    }

    if (!result) {
      return errorResponse("Không tìm thấy hoặc không có gì để cập nhật");
    }

    return successResponse(result, "Đã cập nhật thành công");
  },
  ["admin"],
);
