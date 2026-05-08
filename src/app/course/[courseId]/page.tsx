"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@/types";
import { getUser } from "@/lib/auth";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
}

interface Topic {
  id: number;
  slug: string;
  title: string;
  description: string;
  lesson_count: number;
}

interface Lesson {
  id: number;
  slug: string;
  title: string;
  description: string;
  summary: string;
}

interface Session {
  id: number;
  title: string;
  description: string;
  game_title: string;
  class_name: string;
  duration_minutes: number;
  started_at: string;
  time_left_minutes: number;
  submissions_count?: number;
  max_submissions?: number;
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<{
    [key: number]: boolean;
  }>({});
  const [lessonsMap, setLessonsMap] = useState<{
    [key: number]: Lesson[];
  }>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isVirtualCourse, setIsVirtualCourse] = useState(false);
  const [unlockedTopics, setUnlockedTopics] = useState<string[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);
  const { courseId } = use(params);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push(`/login?next=course&course=${encodeURIComponent(courseId)}`);
    } else {
      setUser(currentUser);
    }
  }, [router, courseId]);

  // Fetch data khi user đã loaded
  useEffect(() => {
    if (!user) return;

    // Kiểm tra nếu là virtual course
    if (courseId === "virtual-sessions") {
      setIsVirtualCourse(true);
      fetchActiveSessions();
    } else {
      fetchCourseData();
    }
  }, [user, courseId]);

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch("/api/student/sessions/active");
      const data = await res.json();
      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async () => {
    if (!user) {
      console.log("⚠️ User not loaded yet");
      return;
    }

    try {
      console.log(
        "🔍 Fetching course data for:",
        courseId,
        "User role:",
        user.role,
      );

      // Fetch course info
      const courseRes = await fetch(`/api/courses`);
      const courseData = await courseRes.json();
      console.log("📚 Courses response:", courseData);

      if (courseData.success) {
        const foundCourse = courseData.courses.find(
          (c: Course) => c.slug === courseId,
        );
        console.log("🎯 Found course:", foundCourse);

        if (foundCourse) {
          setCourse(foundCourse);

          let allowedTopics: string[] = [];
          let allowedLessons: string[] = [];

          // Nếu là student, lấy danh sách content đã unlock
          if (user.role === "student") {
            console.log("📡 Fetching student permissions...");
            const accessRes = await fetch(
              `/api/student/course-access?courseId=${foundCourse.id}`,
            );
            const accessData = await accessRes.json();
            console.log("🔐 Permission response:", accessData);

            if (accessData.success) {
              allowedTopics = accessData.data.topics || [];
              allowedLessons = accessData.data.lessons || [];
              setUnlockedTopics(allowedTopics);
              setUnlockedLessons(allowedLessons);
              console.log("🔓 Unlocked topics:", allowedTopics);
              console.log("🔓 Unlocked lessons:", allowedLessons);

              // Nếu không có content nào unlock, dừng luôn
              if (allowedTopics.length === 0 && allowedLessons.length === 0) {
                console.log("⚠️ No unlocked content - showing empty state");
                setTopics([]);
                setLoading(false);
                return;
              }
            }
          }

          // Fetch topics
          const topicsRes = await fetch(`/api/courses/${courseId}/topics`);
          const topicsData = await topicsRes.json();
          console.log("📖 Topics response:", topicsData);

          if (topicsData.success && topicsData.topics.length > 0) {
            let filteredTopics = topicsData.topics;

            // Nếu là student, chỉ hiện topics đã unlock
            if (user.role === "student") {
              filteredTopics = topicsData.topics.filter((t: Topic) =>
                allowedTopics.includes(String(t.id)),
              );
              console.log("📚 Filtered topics for student:", filteredTopics);

              // Nếu không có topic nào được unlock
              if (filteredTopics.length === 0) {
                console.log("⚠️ No topics unlocked after filter");
                setTopics([]);
                setLoading(false);
                return;
              }
            }

            setTopics(filteredTopics);

            if (filteredTopics.length > 0) {
              // Auto expand first topic
              setExpandedTopics({ [filteredTopics[0].id]: true });
              // Load lessons for first topic
              await loadLessonsWithFilter(filteredTopics[0].id, allowedLessons);
            }
          }
        } else {
          console.error("❌ Course not found with slug:", courseId);
        }
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonsWithFilter = async (
    topicId: number,
    allowedLessons: string[],
  ) => {
    if (lessonsMap[topicId]) return;

    try {
      const res = await fetch(
        `/api/courses/${courseId}/topics/${topicId}/lessons`,
      );
      const data = await res.json();

      if (data.success) {
        let lessons = data.lessons;

        if (user?.role === "student" && allowedLessons.length >= 0) {
          lessons = data.lessons.filter((l: Lesson) =>
            allowedLessons.includes(String(l.id)),
          );
          console.log(`📝 Filtered lessons for topic ${topicId}:`, lessons);
        }

        setLessonsMap((prev) => ({ ...prev, [topicId]: lessons }));
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
  };

  const loadLessons = async (topicId: number) => {
    await loadLessonsWithFilter(topicId, unlockedLessons);
  };

  const toggleTopic = (topicId: number) => {
    setExpandedTopics((prev) => {
      const newState = { ...prev, [topicId]: !prev[topicId] };
      // Load lessons when expanding
      if (newState[topicId]) {
        loadLessons(topicId);
      }
      return newState;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  // Virtual Course: Hiển thị Sessions
  if (isVirtualCourse) {
    return (
      <main className="flex-1">
        <section className="px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <Link
                href="/game"
                className="text-blue-600 hover:underline mb-3 sm:mb-4 inline-block text-sm sm:text-base"
              >
                ← Quay lại danh sách khóa học
              </Link>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                📝 Bài kiểm tra đang mở
              </h2>
              <p className="text-sm sm:text-base text-gray-700">
                Danh sách các bài kiểm tra đang diễn ra. Nhấp vào để tham gia
                ngay!
              </p>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 rounded-lg text-center">
                <p className="text-gray-600 text-base sm:text-lg mb-2">
                  Hiện tại chưa có bài kiểm tra nào đang mở
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Giáo viên sẽ mở bài kiểm tra trong giờ học
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white border-2 border-blue-200 rounded-xl p-5 sm:p-6 hover:shadow-xl transition-all hover:border-blue-400 cursor-pointer"
                    onClick={() => router.push(`/play?sessionId=${session.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex-1">
                        {session.title}
                      </h3>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                        Đang mở
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-gray-600 mb-3">
                      {session.description}
                    </p>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">🎮 Game:</span>
                        <span className="break-words flex-1">
                          {session.game_title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">👥 Lớp:</span>
                        <span>{session.class_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="font-medium">⏱️ Thời gian:</span>
                        <span>
                          {session.duration_minutes} phút (còn{" "}
                          {session.time_left_minutes} phút)
                        </span>
                      </div>
                      {session.max_submissions && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">📊 Lần nộp:</span>
                          <span>
                            {session.submissions_count || 0}/
                            {session.max_submissions}
                          </span>
                        </div>
                      )}
                    </div>

                    <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base hover:shadow-lg transition-all">
                      Tham gia ngay →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex-1 px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-5 sm:p-6 rounded-lg">
            <p className="text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">
              Không tìm thấy khóa học. Vui lòng chọn lại.
            </p>
            <Link
              href="/game"
              className="text-blue-600 hover:underline text-sm sm:text-base"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <Link
              href="/game"
              className="text-blue-600 hover:underline mb-3 sm:mb-4 inline-block text-sm sm:text-base"
            >
              ← Quay lại danh sách khóa học
            </Link>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              {course.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              {course.description}
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {topics.map((topic) => (
              <article
                key={topic.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Topic Header */}
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full p-4 sm:p-6 flex items-start sm:items-center justify-between hover:bg-gray-50 transition-colors text-left gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">
                      {topic.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      {topic.description}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 flex-shrink-0">
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {topic.lesson_count} bài học
                    </span>
                    <svg
                      className={`w-5 h-5 sm:w-6 sm:h-6 transform transition-transform ${
                        expandedTopics[topic.id] ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Lessons List */}
                {expandedTopics[topic.id] && (
                  <div className="border-t border-gray-200">
                    {lessonsMap[topic.id] ? (
                      lessonsMap[topic.id].length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {lessonsMap[topic.id].map((lesson) => (
                            <li key={lesson.id}>
                              <Link
                                href={`/lesson/${courseId}/${lesson.slug}`}
                                className="block p-3 sm:p-4 hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-start sm:items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-base sm:text-lg mb-1">
                                      {lesson.title}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                                      {lesson.summary || lesson.description}
                                    </p>
                                  </div>
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-3 sm:p-4 text-gray-500 text-center text-sm sm:text-base">
                          Chưa có bài học nào
                        </div>
                      )
                    ) : (
                      <div className="p-3 sm:p-4 text-gray-500 text-center text-sm sm:text-base">
                        Đang tải...
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
