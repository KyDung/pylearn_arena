// ============================================================
// USER & AUTHENTICATION TYPES
// ============================================================

export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: number;
  username: string;
  password?: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  status: UserStatus;
  createdBy?: number;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreateInput {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  phone?: string;
  createdBy?: number;
}

export interface UserUpdateInput {
  fullName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: UserStatus;
}

// ============================================================
// CLASS TYPES
// ============================================================

export type ClassStatus = "active" | "archived" | "closed";
export type ClassMemberRole = "student" | "assistant";
export type ClassMemberStatus = "active" | "removed" | "left";

export interface Class {
  id: number;
  name: string;
  description?: string;
  code: string;
  teacherId: number;
  teacherName?: string;
  schoolYear?: string;
  grade?: string;
  maxStudents: number;
  status: ClassStatus;
  studentCount?: number;
  courseCount?: number;
  assignmentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassCreateInput {
  name: string;
  description?: string;
  teacherId: number;
  schoolYear?: string;
  grade?: string;
  maxStudents?: number;
}

export interface ClassMember {
  id: number;
  classId: number;
  userId: number;
  username?: string;
  fullName?: string;
  email?: string;
  role: ClassMemberRole;
  status: ClassMemberStatus;
  joinedAt?: Date;
}

// ============================================================
// COURSE ACCESS TYPES
// ============================================================

export interface CourseAccess {
  id: number;
  classId: number;
  courseId: number;
  courseName?: string;
  courseSlug?: string;
  grantedBy: number;
  grantedByName?: string;
  isActive: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
}

// ============================================================
// ASSIGNMENT TYPES
// ============================================================

export type AssignmentStatus = "draft" | "published" | "closed";

export interface Assignment {
  id: number;
  classId: number;
  className?: string;
  gameId: number;
  gameTitle?: string;
  gamePath?: string;
  title: string;
  description?: string;
  createdBy: number;
  createdByName?: string;

  startTime: Date;
  endTime: Date;
  lateSubmission: boolean;
  latePenalty: number;

  maxAttempts?: number;
  showRanking: boolean;
  showAnswersAfter: boolean;

  status: AssignmentStatus;
  submissionCount?: number;
  passedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssignmentCreateInput {
  classId: number;
  gameId: number;
  title: string;
  description?: string;
  createdBy: number;
  startTime: Date;
  endTime: Date;
  lateSubmission?: boolean;
  latePenalty?: number;
  maxAttempts?: number;
  showRanking?: boolean;
  showAnswersAfter?: boolean;
}

// ============================================================
// SUBMISSION TYPES
// ============================================================

export type SubmissionStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "error";

export interface Submission {
  id: number;
  assignmentId: number;
  assignmentTitle?: string;
  userId: number;
  username?: string;
  fullName?: string;

  code: string;

  score?: number;
  passedTests: number;
  totalTests: number;
  executionTime?: number;

  status: SubmissionStatus;
  errorMessage?: string;
  isLate: boolean;

  attemptNumber: number;
  ipAddress?: string;
  userAgent?: string;

  submittedAt?: Date;
  gradedAt?: Date;
}

export interface SubmissionCreateInput {
  assignmentId: number;
  userId: number;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmissionGradeInput {
  score: number;
  passedTests: number;
  totalTests: number;
  executionTime?: number;
  status: SubmissionStatus;
  errorMessage?: string;
}

// ============================================================
// RANKING TYPES
// ============================================================

export interface Ranking {
  id: number;
  assignmentId: number;
  userId: number;
  username?: string;
  fullName?: string;

  bestScore: number;
  bestSubmissionId?: number;
  totalAttempts: number;
  firstPassedAt?: Date;

  rankPosition?: number;
  updatedAt?: Date;
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType = "assignment" | "grade" | "class" | "system";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt?: Date;
}

// ============================================================
// ACTIVITY LOG TYPES
// ============================================================

export interface ActivityLog {
  id: number;
  userId: number;
  username?: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt?: Date;
}

// ============================================================
// GAME & COURSE TYPES (existing, enhanced)
// ============================================================

export interface Game {
  id: number;
  title: string;
  description?: string;
  summary?: string;
  path: string;
  lessonId?: number;
  lessonTitle?: string;
  topicId?: number;
  topicTitle?: string;
  courseId?: number;
  courseTitle?: string;
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  summary?: string;
  topicId?: number;
  sortOrder?: number;
  games?: Game[];
}

export interface Topic {
  id: number;
  title: string;
  description?: string;
  courseId?: number;
  sortOrder?: number;
  lessons?: Lesson[];
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  level: string;
  description: string;
  isPublished: boolean;
  topics?: Topic[];
}

// ============================================================
// DASHBOARD STATS TYPES
// ============================================================

export interface AdminStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalCourses: number;
  totalAssignments: number;
  totalSubmissions: number;
  recentActivity: ActivityLog[];
}

export interface TeacherStats {
  myClasses: number;
  myStudents: number;
  myAssignments: number;
  pendingSubmissions: number;
  recentSubmissions: Submission[];
}

export interface StudentStats {
  myClasses: number;
  availableCourses: number;
  pendingAssignments: number;
  completedAssignments: number;
  myRankings: Ranking[];
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

export const PERMISSIONS = {
  // Admin only
  MANAGE_TEACHERS: ["admin"],
  MANAGE_SYSTEM: ["admin"],
  VIEW_ALL_CLASSES: ["admin"],

  // Admin & Teacher
  CREATE_CLASS: ["admin", "teacher"],
  MANAGE_STUDENTS: ["admin", "teacher"],
  CREATE_ASSIGNMENT: ["admin", "teacher"],
  VIEW_ALL_SUBMISSIONS: ["admin", "teacher"],
  GRANT_COURSE_ACCESS: ["admin", "teacher"],

  // All authenticated users
  VIEW_OWN_PROFILE: ["admin", "teacher", "student"],
  SUBMIT_ASSIGNMENT: ["student"],
  VIEW_OWN_SUBMISSIONS: ["student"],
} as const;

export const hasPermission = (
  userRole: UserRole,
  permission: keyof typeof PERMISSIONS,
): boolean => {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(userRole);
};
