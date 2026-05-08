"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

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
  slug: string;
  title: string;
  description: string;
  sort_order: number;
}

interface Lesson {
  id: string;
  course_id: number;
  topic_id: number;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
}

interface Game {
  id: string;
  lesson_id: string;
  slug: string;
  title: string;
  description: string;
  game_type: string;
  path: string;
  sort_order: number;
}

export default function AdminCMSPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [editMode, setEditMode] = useState<{
    type: "course" | "topic" | "lesson" | "game" | null;
    item: any;
  }>({ type: null, item: null });
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (courseSlug: string) => {
    try {
      const res = await fetch(`/api/courses/${courseSlug}/topics`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data.topics || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLessons = async (courseSlug: string, topicId: number) => {
    try {
      const res = await fetch(
        `/api/courses/${courseSlug}/topics/${topicId}/lessons`,
      );
      if (res.ok) {
        const data = await res.json();
        setLessons(data.lessons || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadGames = async (courseSlug: string, lessonId: string) => {
    try {
      const res = await fetch(
        `/api/courses/${courseSlug}/lessons/${lessonId}/games`,
      );
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTopic(null);
    setSelectedLesson(null);
    setTopics([]);
    setLessons([]);
    setGames([]);
    loadTopics(course.slug);
  };

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedLesson(null);
    setLessons([]);
    setGames([]);
    if (selectedCourse) {
      loadLessons(selectedCourse.slug, topic.id);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setGames([]);
    if (selectedCourse) {
      loadGames(selectedCourse.slug, lesson.id);
    }
  };

  const startEdit = (
    type: "course" | "topic" | "lesson" | "game",
    item: any,
  ) => {
    setEditMode({ type, item });
    setEditFormData({ ...item });
  };

  const cancelEdit = () => {
    setEditMode({ type: null, item: null });
    setEditFormData({});
  };

  const saveEdit = async () => {
    if (!editMode.type || !editMode.item) return;

    try {
      const endpoint = `/api/admin/${editMode.type}s/${editMode.item.id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) throw new Error("Update failed");

      alert("Cập nhật thành công!");

      // Reload data
      if (editMode.type === "course") {
        await loadCourses();
        const updated = courses.find((c) => c.id === editMode.item.id);
        if (updated) setSelectedCourse(updated);
      } else if (editMode.type === "topic" && selectedCourse) {
        await loadTopics(selectedCourse.slug);
      } else if (
        editMode.type === "lesson" &&
        selectedCourse &&
        selectedTopic
      ) {
        await loadLessons(selectedCourse.slug, selectedTopic.id);
      } else if (editMode.type === "game" && selectedCourse && selectedLesson) {
        await loadGames(selectedCourse.slug, selectedLesson.id);
      }

      cancelEdit();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Modern Gradient Header */}
      <header className="bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="text-5xl">🎮</span>
                Quản lý Nội dung & Game
              </h1>
              <p className="text-purple-100 text-lg">
                Chỉnh sửa metadata và nội dung game, bài học
              </p>
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              ← Quay lại Admin
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Column 1: Courses */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">📖</span>
              Khóa học
              <span className="ml-auto text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {courses.length}
              </span>
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                    selectedCourse?.id === course.id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg"
                      : "bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 border-2 border-transparent hover:border-blue-200 hover:shadow-md"
                  }`}
                  onClick={() => handleSelectCourse(course)}
                >
                  <div className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors mb-3">
                    {course.title}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit("course", course);
                    }}
                    className="text-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 transform"
                  >
                    ✏️ Sửa
                  </button>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-5xl mb-3">📚</p>
                  <p>Chưa có khóa học</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Topics */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-green-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">📑</span>
              Chương
              {topics.length > 0 && (
                <span className="ml-auto text-sm font-normal bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {topics.length}
                </span>
              )}
            </h2>
            {!selectedCourse ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">👈</p>
                <p>Chọn khóa học</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {topics.map((topic, idx) => (
                  <div
                    key={topic.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                      selectedTopic?.id === topic.id
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 shadow-lg"
                        : "bg-gray-50 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border-2 border-transparent hover:border-green-200 hover:shadow-md"
                    }`}
                    onClick={() => handleSelectTopic(topic)}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-lg text-gray-900 group-hover:text-green-700 transition-colors">
                        {topic.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit("topic", topic);
                      }}
                      className="text-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 transform"
                    >
                      ✏️ Sửa
                    </button>
                  </div>
                ))}
                {topics.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-5xl mb-3">📄</p>
                    <p>Không có chương</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 3: Lessons */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">📝</span>
              Bài học
              {lessons.length > 0 && (
                <span className="ml-auto text-sm font-normal bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  {lessons.length}
                </span>
              )}
            </h2>
            {!selectedTopic ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">👈</p>
                <p>Chọn chương</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                      selectedLesson?.id === lesson.id
                        ? "bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-500 shadow-lg"
                        : "bg-gray-50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 border-2 border-transparent hover:border-purple-200 hover:shadow-md"
                    }`}
                    onClick={() => handleSelectLesson(lesson)}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-lg text-gray-900 group-hover:text-purple-700 transition-colors">
                        {lesson.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit("lesson", lesson);
                      }}
                      className="text-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 transform"
                    >
                      ✏️ Sửa
                    </button>
                  </div>
                ))}
                {lessons.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-5xl mb-3">📄</p>
                    <p>Không có bài học</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 4: Games */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-pink-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
              <span className="text-3xl">🎮</span>
              Games
              {games.length > 0 && (
                <span className="ml-auto text-sm font-normal bg-pink-100 text-pink-700 px-3 py-1 rounded-full">
                  {games.length}
                </span>
              )}
            </h2>
            {!selectedLesson ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-3">👈</p>
                <p>Chọn bài học</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {games.map((game, idx) => (
                  <div
                    key={game.id}
                    className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-pink-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-lg text-gray-900 group-hover:text-pink-700 transition-colors">
                        {game.title}
                      </span>
                    </div>
                    <div className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium inline-block mb-3">
                      {game.game_type}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => startEdit("game", game)}
                        className="text-sm px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 transform"
                      >
                        ✏️ Sửa metadata
                      </button>
                      <button
                        onClick={() => {
                          if (!game.path) {
                            alert(
                              "Game không có path. Vui lòng kiểm tra dữ liệu trong database.",
                            );
                            return;
                          }
                          router.push(
                            `/admin/cms/game-content/${encodeURIComponent(game.path)}`,
                          );
                        }}
                        className="text-sm px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-medium shadow-md hover:shadow-lg hover:scale-105 transform"
                      >
                        🎨 Sửa nội dung
                      </button>
                    </div>
                  </div>
                ))}
                {games.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-5xl mb-3">🎮</p>
                    <p>Không có game</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modern Edit Modal */}
        {editMode.type && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 px-6 py-5">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">✏️</span>
                  Chỉnh sửa{" "}
                  {editMode.type === "course"
                    ? "khóa học"
                    : editMode.type === "topic"
                      ? "chương"
                      : editMode.type === "lesson"
                        ? "bài học"
                        : "game"}
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
                    value={editFormData.title || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    placeholder="Nhập tiêu đề..."
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    📄 Mô tả
                  </label>
                  <textarea
                    value={editFormData.description || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        description: e.target.value,
                      })
                    }
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    placeholder="Nhập mô tả..."
                  />
                </div>

                {editMode.type === "course" && (
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      🎯 Độ khó
                    </label>
                    <select
                      value={editFormData.difficulty || "beginner"}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          difficulty: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition-all hover:scale-105 transform"
                >
                  Hủy
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 transform"
                >
                  💾 Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
