/**
 * 🎯 Service Layer - Export tất cả services
 *
 * Usage:
 *   import { CourseService, GameService, UserService } from "@/lib/services";
 *
 *   const courses = await CourseService.getPublishedCourses();
 *   const game = await GameService.getGameByPath("python-basics/chapter-1/t10-cd-b12/id1");
 *   const users = await UserService.getUsers({ role: "student" });
 */

// Core services
export { CourseService } from "./courses";
export { TopicService } from "./topics";
export { LessonService } from "./lessons";
export { GameService } from "./games";
export { ProgressService } from "./progress";

// Management services
export * as UserService from "./users";
export * as ClassService from "./classes";
export * as AssignmentService from "./assignments";
export * as SubmissionService from "./submissions";

// Re-export types from services
export type { Course } from "./courses";
export type { Topic } from "./topics";
export type { Lesson } from "./lessons";
export type { Game, GameWithContext } from "./games";
export type { UserProgress } from "./progress";

// Re-export all types from types/index.ts
export type {
  User,
  UserRole,
  UserStatus,
  UserCreateInput,
  UserUpdateInput,
  Class,
  ClassStatus,
  ClassCreateInput,
  ClassMember,
  ClassMemberRole,
  ClassMemberStatus,
  CourseAccess,
  Assignment,
  AssignmentStatus,
  AssignmentCreateInput,
  Submission,
  SubmissionStatus,
  SubmissionCreateInput,
  SubmissionGradeInput,
  Ranking,
  Notification,
  NotificationType,
  ActivityLog,
  AdminStats,
  TeacherStats,
  StudentStats,
  ApiResponse,
  PaginatedResponse,
} from "@/types";
