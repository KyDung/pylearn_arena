"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  is_published: boolean;
}

interface Topic {
  id: number;
  course_id: number;
  title: string;
  description: string;
  sort_order: number;
}

interface Lesson {
  id: number;
  topic_id: number;
  title: string;
  description: string;
  notes: string;
  sort_order: number;
}

interface Game {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  game_type: string;
  is_active: boolean;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    type: "course" | "topic" | "lesson" | "game";
    item: Course | Topic | Lesson | Game;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    notes: "",
    is_published: true,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "admin") {
        router.push("/");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/admin/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: number) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCourse(data.data);
        setTopics(data.data.topics || []);
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
    }
  };

  const fetchTopicLessons = async (topicId: number) => {
    try {
      // Get lessons from topics
      const topic = topics.find((t) => t.id === topicId);
      if (topic) {
        // Since we already have topics with lessons from course details, just filter
        const res = await fetch(
          `/api/courses/${selectedCourse?.id}/topics/${topicId}/lessons`,
        );
        if (res.ok) {
          const data = await res.json();
          setLessons(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchLessonGames = async (lessonId: number) => {
    try {
      const res = await fetch(
        `/api/courses/${selectedCourse?.id}/lessons/${lessonId}/games`,
      );
      if (res.ok) {
        const data = await res.json();
        setGames(data.data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const openEditModal = (
    type: "course" | "topic" | "lesson" | "game",
    item: Course | Topic | Lesson | Game,
  ) => {
    setEditModal({ type, item });
    setEditForm({
      title: "title" in item ? item.title : "",
      description: item.description || "",
      notes: "notes" in item ? item.notes || "" : "",
      is_published: "is_published" in item ? item.is_published : true,
      is_active: "is_active" in item ? item.is_active : true,
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editModal.type,
          id: editModal.item.id,
          data: {
            title: editForm.title,
            description: editForm.description,
            ...(editModal.type === "lesson" && { notes: editForm.notes }),
            ...(editModal.type === "course" && {
              is_published: editForm.is_published,
            }),
            ...(editModal.type === "game" && { is_active: editForm.is_active }),
          },
        }),
      });

      if (!res.ok) throw new Error("Lỗi lưu");

      // Refresh data
      if (editModal.type === "course") {
        await fetchCourses();
        if (selectedCourse) {
          await fetchCourseDetails(selectedCourse.id);
        }
      } else {
        if (selectedCourse) {
          await fetchCourseDetails(selectedCourse.id);
        }
      }

      setEditModal(null);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Có lỗi xảy ra khi lưu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Gradient Header */}
      <header className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 backdrop-blur-sm font-medium"
              >
                ← Quay lại
              </Link>
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  <span className="text-5xl">📚</span>
                  Quản lý Khóa học
                </h1>
                <p className="text-green-100 text-lg mt-1">
                  Chỉnh sửa nội dung khóa học, chương, bài học và games
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Course List */}
          <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">📖</span>
              Khóa học
              <span className="ml-auto text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {courses.length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                    selectedCourse?.id === course.id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg"
                      : "bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-2 border-transparent hover:border-blue-200 hover:shadow-md"
                  }`}
                  onClick={() => fetchCourseDetails(course.id)}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-gray-900 font-bold text-lg flex-1 group-hover:text-blue-700 transition-colors">
                      {course.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal("course", course);
                      }}
                      className="text-gray-400 hover:text-blue-600 hover:scale-110 transition-transform ml-2 text-xl"
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        course.is_published
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {course.is_published ? "✓ Published" : "⊘ Draft"}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {course.difficulty}
                    </span>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-5xl mb-3">📚</p>
                  <p>Chưa có khóa học nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Topics & Lessons */}
          <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden border border-green-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">📑</span>
              {selectedCourse ? (
                <span className="flex-1 truncate">{selectedCourse.title}</span>
              ) : (
                "Chọn khóa học"
              )}
              {selectedCourse && (
                <span className="ml-auto text-sm font-normal bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {topics.length}
                </span>
              )}
            </h2>
            {selectedCourse && topics.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {topics.map((topic, idx) => (
                  <div
                    key={topic.id}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                            #{idx + 1}
                          </span>
                          <span className="text-gray-900 font-bold text-lg group-hover:text-green-700 transition-colors">
                            {topic.title}
                          </span>
                        </div>
                        {topic.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {topic.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openEditModal("topic", topic)}
                        className="text-gray-400 hover:text-green-600 hover:scale-110 transition-transform ml-2 text-xl flex-shrink-0"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                    </div>
                    <button
                      onClick={() => fetchTopicLessons(topic.id)}
                      className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 transform text-sm"
                    >
                      Xem bài học →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">{selectedCourse ? "📄" : "👈"}</p>
                <p>
                  {selectedCourse
                    ? "Không có chương nào"
                    : "Chọn một khóa học để xem chi tiết"}
                </p>
              </div>
            )}
          </div>

          {/* Lessons & Games */}
          <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden border border-purple-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">🎮</span>
              {lessons.length > 0
                ? "Bài học"
                : games.length > 0
                  ? "Games"
                  : "Bài học & Games"}
              {(lessons.length > 0 || games.length > 0) && (
                <span className="ml-auto text-sm font-normal bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  {lessons.length || games.length}
                </span>
              )}
            </h2>
            {lessons.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                            #{idx + 1}
                          </span>
                          <span className="text-gray-900 font-bold text-lg group-hover:text-purple-700 transition-colors">
                            {lesson.title}
                          </span>
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {lesson.description}
                          </p>
                        )}
                        {lesson.notes && (
                          <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                            📝{" "}
                            <span className="font-medium">{lesson.notes}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openEditModal("lesson", lesson)}
                        className="text-gray-400 hover:text-purple-600 hover:scale-110 transition-transform ml-2 text-xl flex-shrink-0"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                    </div>
                    <button
                      onClick={() => fetchLessonGames(lesson.id)}
                      className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 transform text-sm"
                    >
                      Xem games →
                    </button>
                  </div>
                ))}
              </div>
            ) : games.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {games.map((game, idx) => (
                  <div
                    key={game.id}
                    className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                            #{idx + 1}
                          </span>
                          <span className="text-gray-900 font-bold group-hover:text-indigo-700 transition-colors">
                            {game.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {game.game_type}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              game.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {game.is_active ? "✓ Active" : "⊘ Inactive"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => openEditModal("game", game)}
                        className="text-gray-400 hover:text-indigo-600 hover:scale-110 transition-transform ml-2 text-xl"
                        title="Chỉnh sửa"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">👈</p>
                <p>Chọn chương để xem bài học</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">✏️</span>
                Sửa{" "}
                {editModal.type === "course"
                  ? "Khóa học"
                  : editModal.type === "topic"
                    ? "Chương"
                    : editModal.type === "lesson"
                      ? "Bài học"
                      : "Game"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  📝 Tiêu đề
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="Nhập tiêu đề..."
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  📄 Mô tả
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  placeholder="Nhập mô tả..."
                />
              </div>

              {editModal.type === "lesson" && (
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    👨‍🏫 Ghi chú (cho Giáo viên)
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-gray-900 resize-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                    placeholder="Ghi chú hướng dẫn cho giáo viên..."
                  />
                </div>
              )}

              {editModal.type === "course" && (
                <label className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editForm.is_published}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_published: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-gray-800 font-medium">
                    ✓ Đã xuất bản
                  </span>
                </label>
              )}

              {editModal.type === "game" && (
                <label className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_active: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-800 font-medium">
                    ⚡ Đang hoạt động
                  </span>
                </label>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all hover:scale-105 transform"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 transform"
              >
                {saving ? "Đang lưu..." : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
