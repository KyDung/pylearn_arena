"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Class {
  id: number;
  name: string;
  description: string;
  student_count: number;
  course_count: number;
}

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
}

interface Topic {
  id: string;
  name: string;
  lessons?: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  games?: any[];
}

interface ContentAccess {
  content_type: "topic" | "lesson";
  content_id: string;
  is_unlocked: boolean;
}

export default function CourseAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(
    null,
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseStructure, setCourseStructure] = useState<Topic[]>([]);
  const [contentAccess, setContentAccess] = useState<ContentAccess[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Lấy danh sách lớp học
  useEffect(() => {
    fetchClasses();
  }, []);

  // Lấy danh sách khóa học khi chọn lớp
  useEffect(() => {
    if (selectedClassId) {
      fetchCourses();
    }
  }, [selectedClassId]);

  // Lấy cấu trúc khóa học và quyền truy cập khi chọn khóa học
  useEffect(() => {
    if (selectedClassId && selectedCourseId && selectedCourseSlug) {
      fetchCourseStructure();
      fetchContentAccess();
    }
  }, [selectedClassId, selectedCourseId, selectedCourseSlug]);

  const fetchClasses = async () => {
    try {
      const res = await fetch("/api/teacher/course-access");
      const data = await res.json();
      if (data.success) {
        setClasses(data.data.classes);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/teacher/courses");
      const data = await res.json();
      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchCourseStructure = async () => {
    try {
      console.log("🔍 Fetching course structure for slug:", selectedCourseSlug);
      // Dùng slug để fetch topics
      const res = await fetch(`/api/courses/${selectedCourseSlug}/topics`);
      const data = await res.json();
      console.log("📖 Topics response:", data);

      if (data.success) {
        // Lấy topics với lessons nested
        const topics = data.topics || [];
        console.log("📚 Topics count:", topics.length);

        // Load lessons cho mỗi topic
        const topicsWithLessons = await Promise.all(
          topics.map(async (topic: any) => {
            console.log(`📝 Fetching lessons for topic ${topic.id}...`);
            const lessonsRes = await fetch(
              `/api/courses/${selectedCourseSlug}/topics/${topic.id}/lessons`,
            );
            const lessonsData = await lessonsRes.json();
            console.log(`✅ Topic ${topic.id} lessons:`, lessonsData);
            return {
              ...topic,
              lessons: lessonsData.success ? lessonsData.lessons : [],
            };
          }),
        );

        console.log("🎯 Final course structure:", topicsWithLessons);
        setCourseStructure(topicsWithLessons);
      }
    } catch (error) {
      console.error("Error fetching course structure:", error);
    }
  };

  const fetchContentAccess = async () => {
    try {
      const res = await fetch(
        `/api/teacher/course-access?classId=${selectedClassId}&courseId=${selectedCourseId}`,
      );
      const data = await res.json();
      if (data.success) {
        setContentAccess(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching content access:", error);
    }
  };

  const isContentUnlocked = (
    contentType: string,
    contentId: string | number,
  ) => {
    const access = contentAccess.find(
      (a) =>
        a.content_type === contentType &&
        String(a.content_id) === String(contentId),
    );
    return access?.is_unlocked || false;
  };

  const handleToggleContent = async (
    contentType: "topic" | "lesson",
    contentId: string,
    currentStatus: boolean,
  ) => {
    if (!selectedClassId || !selectedCourseId) return;

    console.log("🔄 Toggle content:", {
      contentType,
      contentId,
      currentStatus,
      classId: selectedClassId,
      courseId: selectedCourseId,
    });

    setSubmitting(true);
    try {
      const method = currentStatus ? "DELETE" : "POST";
      const endpoint = currentStatus
        ? "/api/teacher/course-access"
        : "/api/teacher/course-access";

      console.log("📡 Sending request:", { method, endpoint });

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          courseId: selectedCourseId,
          contentType,
          contentId,
        }),
      });

      const data = await res.json();
      console.log("📥 Response:", data);

      if (data.success) {
        console.log("✅ Toggle successful, refreshing access...");
        // Refresh content access
        await fetchContentAccess();
      } else {
        console.error("❌ Toggle failed:", data.message);
        alert("Lỗi: " + data.message);
      }
    } catch (error) {
      console.error("Error toggling content:", error);
      alert("Có lỗi xảy ra!");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/teacher")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Quay lại
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          🔐 Phân quyền Khóa học
        </h1>
        <p className="text-gray-600 mt-2">
          Mở/khóa các chương và bài học cho từng lớp
        </p>
      </div>

      {/* Selection Panel */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chọn lớp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Chọn lớp học
            </label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => {
                setSelectedClassId(
                  e.target.value ? parseInt(e.target.value) : null,
                );
                setSelectedCourseId(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.student_count} HS)
                </option>
              ))}
            </select>
          </div>

          {/* Chọn khóa học */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Chọn khóa học
            </label>
            <select
              value={selectedCourseId || ""}
              onChange={(e) => {
                const courseId = e.target.value || null;
                console.log("📚 Course selected - ID:", courseId);
                setSelectedCourseId(courseId);
                // Lấy slug từ course được chọn
                if (courseId) {
                  console.log("🔍 Looking for course with ID:", courseId);
                  console.log("📋 Available courses:", courses);
                  // Convert cả 2 về string để so sánh
                  const course = courses.find(
                    (c) => String(c.id) === String(courseId),
                  );
                  console.log("✅ Found course:", course);
                  setSelectedCourseSlug(course?.slug || null);
                  console.log("🏷️ Set slug to:", course?.slug || null);
                } else {
                  setSelectedCourseSlug(null);
                }
              }}
              disabled={!selectedClassId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Chọn khóa học --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions - Ẩn/Hiện toàn bộ khóa học */}
      {selectedClassId && selectedCourseId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-2">⚡ Thao tác nhanh</h3>
          <p className="text-sm text-gray-600 mb-3">
            Ẩn/Hiện toàn bộ khóa học cho lớp này (không cần chọn từng chương)
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (!window.confirm("Hiện toàn bộ khóa học cho lớp này?"))
                  return;
                setSubmitting(true);
                try {
                  const res = await fetch(
                    "/api/teacher/course-access/show-course",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        classId: selectedClassId,
                        courseId: selectedCourseId,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (data.success) {
                    alert("✅ Đã hiện khóa học cho lớp!");
                  } else {
                    alert("❌ Lỗi: " + data.message);
                  }
                } catch (error) {
                  alert("❌ Có lỗi xảy ra!");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              👁️ Hiện khóa học
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("Ẩn toàn bộ khóa học khỏi lớp này?"))
                  return;
                setSubmitting(true);
                try {
                  const res = await fetch(
                    "/api/teacher/course-access/hide-course",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        classId: selectedClassId,
                        courseId: selectedCourseId,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (data.success) {
                    alert("✅ Đã ẩn khóa học khỏi lớp!");
                  } else {
                    alert("❌ Lỗi: " + data.message);
                  }
                } catch (error) {
                  alert("❌ Có lỗi xảy ra!");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              🚫 Ẩn khóa học
            </button>
          </div>
        </div>
      )}

      {/* Course Structure & Access Control */}
      {selectedClassId && selectedCourseId && courseStructure.length > 0 && (
        <div className="space-y-4">
          {courseStructure.map((topic, topicIndex) => {
            const topicUnlocked = isContentUnlocked("topic", topic.id);

            return (
              <div
                key={topic.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Topic Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">
                      Chương {topicIndex + 1}:
                    </span>
                    <span className="text-lg">{topic.name}</span>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleContent(
                        "topic",
                        String(topic.id),
                        topicUnlocked,
                      )
                    }
                    disabled={submitting}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      topicUnlocked
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    } disabled:opacity-50`}
                  >
                    {topicUnlocked ? "🔓 Đã mở" : "🔒 Đã khóa"}
                  </button>
                </div>

                {/* Lessons */}
                {topic.lessons && topic.lessons.length > 0 && (
                  <div className="p-4 space-y-2">
                    {topic.lessons.map((lesson, lessonIndex) => {
                      const lessonUnlocked = isContentUnlocked(
                        "lesson",
                        lesson.id,
                      );

                      return (
                        <div
                          key={lesson.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-600">
                              Bài {lessonIndex + 1}:
                            </span>
                            <span className="text-gray-800">
                              {lesson.title}
                            </span>
                            {lesson.games && (
                              <span className="text-sm text-gray-500">
                                ({lesson.games.length} game)
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleToggleContent(
                                "lesson",
                                String(lesson.id),
                                lessonUnlocked,
                              )
                            }
                            disabled={submitting}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              lessonUnlocked
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            } disabled:opacity-50`}
                          >
                            {lessonUnlocked ? "🔓 Mở" : "🔒 Khóa"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedClassId && selectedCourseId && courseStructure.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            Khóa học chưa có nội dung
          </h3>
          <p className="text-gray-500">
            Khóa học này chưa có chương hoặc bài học nào.
          </p>
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👆</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            Bắt đầu bằng cách chọn lớp học
          </h3>
          <p className="text-gray-500">
            Chọn lớp và khóa học để quản lý quyền truy cập
          </p>
        </div>
      )}
    </main>
  );
}
