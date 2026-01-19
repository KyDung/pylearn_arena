/**
 * 🎯 Service Layer - Export tất cả services
 *
 * Usage:
 *   import { CourseService, GameService } from "@/lib/services";
 *
 *   const courses = await CourseService.getPublishedCourses();
 *   const game = await GameService.getGameByPath("python-basics/chapter-1/t10-cd-b12/id1");
 */

export { CourseService } from "./courses";
export { TopicService } from "./topics";
export { LessonService } from "./lessons";
export { GameService } from "./games";
export { ProgressService } from "./progress";

// Re-export types
export type { Course } from "./courses";
export type { Topic } from "./topics";
export type { Lesson } from "./lessons";
export type { Game, GameWithContext } from "./games";
export type { UserProgress } from "./progress";
