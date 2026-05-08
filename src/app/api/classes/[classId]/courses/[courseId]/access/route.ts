import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  canManageClass,
} from "@/lib/apiAuth";
import {
  getClassCourseAccess,
  unlockContent,
  lockContent,
  bulkUnlockContent,
  bulkLockContent,
} from "@/lib/services/courseAccess";
import { getClassById } from "@/lib/services/classes";
import { TopicService, LessonService } from "@/lib/services/courses";

// GET /api/classes/[classId]/courses/[courseId]/access
// Lấy trạng thái unlock của course cho class
export const GET = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    const courseId = parseInt(params?.courseId || "0");

    if (!classId || !courseId) return errorResponse("Invalid IDs");

    const classData = await getClassById(classId);
    if (!classData) return errorResponse("Class not found", 404);

    // Check permission
    if (user.role !== "admin" && !canManageClass(user, classData.teacherId)) {
      return errorResponse("Forbidden", 403);
    }

    // Get current access status
    const accessList = await getClassCourseAccess(classId, courseId);

    // Get all topics and lessons for this course
    const topics = await TopicService.getTopicsByCourse(courseId);
    const allLessons = [];

    for (const topic of topics) {
      const lessons = await LessonService.getLessonsByTopic(topic.id);
      allLessons.push(...lessons);
    }

    // Build response with unlock status
    const topicsWithStatus = topics.map((topic) => {
      const access = accessList.find(
        (a) =>
          a.content_type === "topic" && a.content_id === topic.id.toString(),
      );
      return {
        ...topic,
        isUnlocked: access?.is_unlocked || false,
        unlockedAt: access?.unlocked_at || null,
      };
    });

    const lessonsWithStatus = allLessons.map((lesson) => {
      const access = accessList.find(
        (a) => a.content_type === "lesson" && a.content_id === lesson.id,
      );
      return {
        ...lesson,
        isUnlocked: access?.is_unlocked || false,
        unlockedAt: access?.unlocked_at || null,
      };
    });

    return successResponse({
      topics: topicsWithStatus,
      lessons: lessonsWithStatus,
    });
  },
  ["admin", "teacher"],
);

// POST /api/classes/[classId]/courses/[courseId]/access
// Unlock/lock content (single or bulk)
export const POST = withAuth(
  async (request: NextRequest, { params, user }) => {
    const classId = parseInt(params?.classId || "0");
    const courseId = parseInt(params?.courseId || "0");

    if (!classId || !courseId) return errorResponse("Invalid IDs");

    const classData = await getClassById(classId);
    if (!classData) return errorResponse("Class not found", 404);

    // Check permission
    if (user.role !== "admin" && !canManageClass(user, classData.teacherId)) {
      return errorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const { action, contentType, contentId, contentIds } = body;

    if (!action || !contentType) {
      return errorResponse("Missing action or contentType");
    }

    if (action === "unlock") {
      if (contentIds && Array.isArray(contentIds)) {
        // Bulk unlock
        const count = await bulkUnlockContent(
          classId,
          courseId,
          contentType,
          contentIds,
          user.id,
        );
        return successResponse(
          { affectedRows: count },
          `Unlocked ${count} ${contentType}(s)`,
        );
      } else if (contentId) {
        // Single unlock
        await unlockContent(classId, courseId, contentType, contentId, user.id);
        return successResponse(null, `${contentType} unlocked successfully`);
      }
    } else if (action === "lock") {
      if (contentIds && Array.isArray(contentIds)) {
        // Bulk lock
        const count = await bulkLockContent(
          classId,
          courseId,
          contentType,
          contentIds,
        );
        return successResponse(
          { affectedRows: count },
          `Locked ${count} ${contentType}(s)`,
        );
      } else if (contentId) {
        // Single lock
        await lockContent(classId, courseId, contentType, contentId);
        return successResponse(null, `${contentType} locked successfully`);
      }
    }

    return errorResponse("Invalid request");
  },
  ["admin", "teacher"],
);
