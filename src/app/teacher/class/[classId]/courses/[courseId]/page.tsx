"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageUser } from "@/hooks/usePageUser";
import { useLatestRequest } from "@/hooks/useLatestRequest";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { getErrorMessage } from "@/lib/errors";
interface Topic {
  id: number;
  title: string;
  description: string;
  sort_order: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
}

interface Lesson {
  id: string;
  topic_id: number;
  title: string;
  description: string;
  sort_order: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
}

export default function CourseAccessManagementPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  const courseId = params.courseId as string;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);

  const user = usePageUser("admin,teacher");
  const { start, cancel } = useLatestRequest();

  const loadAccess = useCallback(() => {
    const signal = start();

    return fetch(
        `/api/classes/${classId}/courses/${courseId}/access`,
        { signal }).then(async res => {
      if (res.ok) {
        const data = await res.json();
        if (signal.aborted) return;
        const payload = data.data ?? data;
        setTopics(payload.topics || []);
        setLessons(payload.lessons || []);
        setSelectedTopic(previous => payload.topics?.some((topic: Topic) => topic.id === previous)
          ? previous : payload.topics?.[0]?.id ?? null);
      }
    }).catch(err => {
      if (signal.aborted) return;
      console.error(err);
    }).finally(() => { if (!signal.aborted) setLoading(false); });
  }, [classId, courseId, start]);

  useEffect(() => {
    if (user) void loadAccess();
    return cancel;
  }, [user, loadAccess, cancel]);

  const toggleLesson = async (lessonId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? "lock" : "unlock";
      const res = await fetch(
        `/api/classes/${classId}/courses/${courseId}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            contentType: "lesson",
            contentId: lessonId,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to update");

      loadAccess();
    } catch (err) {
      alert("Lỗi: " + getErrorMessage(err));
    }
  };

  const bulkUnlockTopic = async (topicId: number) => {
    const topicLessons = lessons.filter((l) => l.topic_id === topicId);
    const lessonIds = topicLessons.map((l) => l.id);

    if (lessonIds.length === 0) return;

    try {
      const res = await fetch(
        `/api/classes/${classId}/courses/${courseId}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unlock",
            contentType: "lesson",
            contentIds: lessonIds,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to bulk unlock");

      alert(`Đã mở ${lessonIds.length} bài trong chương!`);
      loadAccess();
    } catch (err) {
      alert("Lỗi: " + getErrorMessage(err));
    }
  };

  const bulkLockTopic = async (topicId: number) => {
    const topicLessons = lessons.filter((l) => l.topic_id === topicId);
    const lessonIds = topicLessons.map((l) => l.id);

    if (lessonIds.length === 0) return;

    try {
      const res = await fetch(
        `/api/classes/${classId}/courses/${courseId}/access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "lock",
            contentType: "lesson",
            contentIds: lessonIds,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to bulk lock");

      alert(`Đã khóa ${lessonIds.length} bài trong chương!`);
      loadAccess();
    } catch (err) {
      alert("Lỗi: " + getErrorMessage(err));
    }
  };

  const topicLessons = selectedTopic
    ? lessons.filter((l) => l.topic_id === selectedTopic)
    : [];

  const unlockedCount = topicLessons.filter((l) => l.isUnlocked).length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Đang tải...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold">Quản lý mở bài</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topics List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Các chương</h2>
            <div className="space-y-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedTopic === topic.id
                      ? "bg-blue-100 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedTopic(topic.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{topic.title}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        topic.isUnlocked
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {topic.isUnlocked ? "Đã mở" : "Khóa"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lessons Management */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {!selectedTopic ? (
              <p className="text-gray-500">
                Chọn một chương để quản lý bài học
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {topics.find((t) => t.id === selectedTopic)?.title}
                  </h2>
                  <span className="text-sm text-gray-600">
                    {unlockedCount}/{topicLessons.length} bài đã mở
                  </span>
                </div>

                {/* Bulk Actions */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => bulkUnlockTopic(selectedTopic)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    ✓ Mở tất cả bài trong chương
                  </button>
                  <button
                    onClick={() => bulkLockTopic(selectedTopic)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    ✗ Khóa tất cả bài trong chương
                  </button>
                </div>

                {/* Lessons List */}
                <div className="space-y-3">
                  {topicLessons.length === 0 ? (
                    <p className="text-gray-500">Chương này chưa có bài học</p>
                  ) : (
                    topicLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="border rounded p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{lesson.title}</h3>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {lesson.description}
                            </p>
                          )}
                          {lesson.isUnlocked && lesson.unlockedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Đã mở:{" "}
                              {new Date(lesson.unlockedAt).toLocaleString(
                                "vi-VN",
                              )}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            toggleLesson(lesson.id, lesson.isUnlocked)
                          }
                          className={`ml-4 px-6 py-2 rounded font-semibold whitespace-nowrap ${
                            lesson.isUnlocked
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-green-500 text-white hover:bg-green-600"
                          }`}
                        >
                          {lesson.isUnlocked ? "🔒 Khóa" : "🔓 Mở"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-bold mb-2">ℹ️ Hướng dẫn:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Chọn chương bên trái để xem các bài học</li>
            <li>Click nút “Mở/Khóa” để điều khiển từng bài</li>
            <li>
              Dùng “Mở tất cả bài trong chương” để mở nhanh toàn bộ bài trong 1
              chương
            </li>
            <li>
              Học sinh chỉ thấy các bài đã được mở (games trong bài tự động mở
              theo)
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
