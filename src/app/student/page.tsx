"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePageUser } from "@/hooks/usePageUser";
import type { Class } from "@/types";

export default function StudentDashboard() {
  const router = useRouter();
  const currentUser = usePageUser("admin,teacher,student");
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Join class modal
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const loadData = useCallback(() => {
    return fetch("/api/classes")
      .then(async (classRes) => {
        const classData = await classRes.json();
        if (classData.success) {
          setClasses(classData.data.items || []);
        }
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentUser) void loadData();
  }, [currentUser, loadData]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");

    try {
      const response = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: classCode }),
      });

      const data = await response.json();

      if (data.success) {
        setShowJoinClassModal(false);
        setClassCode("");
        loadData();
      } else {
        setJoinError(data.error || "Không thể tham gia lớp");
      }
    } catch {
      setJoinError("Lỗi kết nối server");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bảng điều khiển
            </h1>
            <p className="text-sm text-gray-500">
              Xin chào, {currentUser.fullName || currentUser.username}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/student/sessions")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              🎮 Phiên học
            </button>
            <button
              onClick={() => setShowJoinClassModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Tham gia lớp
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Về trang chủ
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {classes.length}
            </div>
            <div className="text-gray-500">Lớp học của bạn</div>
          </div>
          <button
            onClick={() => router.push("/student/sessions")}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-3xl font-bold text-purple-600">🎮</div>
            <div className="text-gray-500">Xem phiên học đang mở</div>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Lớp học</h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Đang tải...</div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Bạn chưa tham gia lớp nào
                <button
                  onClick={() => setShowJoinClassModal(true)}
                  className="block mx-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tham gia lớp ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-lg">{cls.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {cls.description || "Không có mô tả"}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span>👨‍🏫 {cls.teacherName}</span>
                      <span>📚 {cls.studentCount} HS</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {cls.schoolYear} • Khối {cls.grade}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Join Class Modal */}
      {showJoinClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tham gia lớp học</h2>

            <form onSubmit={handleJoinClass}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã lớp
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-xl font-mono tracking-widest"
                    placeholder="ABCD1234"
                    maxLength={10}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Nhập mã lớp do giáo viên cung cấp
                  </p>
                </div>

                {joinError && (
                  <div className="text-red-600 text-sm text-center">
                    {joinError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinClassModal(false);
                    setClassCode("");
                    setJoinError("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tham gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
