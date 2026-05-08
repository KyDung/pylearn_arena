import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  notFoundResponse,
} from "@/lib/apiAuth";
import { TopicService } from "@/lib/services/courses";

// GET /api/admin/topics/[id] - Get topic details
export const GET = withAuth(
  async (request: NextRequest, { params }) => {
    const topicId = parseInt(params?.id || "0");
    if (!topicId) return errorResponse("Invalid topic ID");

    const topic = await TopicService.getTopicById(topicId);
    if (!topic) return notFoundResponse("Topic not found");

    return successResponse(topic);
  },
  ["admin"],
);

// PUT /api/admin/topics/[id] - Update topic
export const PUT = withAuth(
  async (request: NextRequest, { params }) => {
    const topicId = parseInt(params?.id || "0");
    if (!topicId) return errorResponse("Invalid topic ID");

    const body = await request.json();
    const { title, description, order_num } = body;

    const updated = await TopicService.updateTopic(topicId, {
      title,
      description,
      order_num,
    });

    if (!updated) return notFoundResponse("Topic not found or no changes");

    return successResponse(updated, "Topic updated successfully");
  },
  ["admin"],
);
