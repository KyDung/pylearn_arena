"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";

interface Session {
  id: number;
  class_id: number;
  game_id: number;
  title: string;
  description?: string;
  started_at: string;
  closed_at?: string;
  status: "active" | "closed";
  total_submissions: number;
  unique_submitters: number;
  class_name?: string;
  game_title?: string;
  creator_name?: string;
}

interface Class {
  id: number;
  name: string;
  code: string;
}

interface Game {
  id: number;
  title: string;
  slug: string;
}

export default function TeacherSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");
  const [selectedClass, setSelectedClass] = useState<string>("");

  const [newSession, setNewSession] = useState({
    class_id: "",
    game_id: "",
    title: "",
    description: "",
    duration_minutes: 60,
  });

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      router.push("/login");
      return;
    }
    loadData();
  }, [filter, selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (selectedClass) params.append("class_id", selectedClass);

      // Load sessions
      const sessionsRes = await fetch(
        `/api/teacher/sessions?${params.toString()}`,
      );
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) {
        setSessions(sessionsData.data.items || []);
      }

      // Load classes
      const classesRes = await fetch("/api/classes");
      const classesData = await classesRes.json();
      if (classesData.success) {
        setClasses(classesData.data.items || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGamesForLesson = async () => {
    try {
      // Simplified: Load all games (filter by course access in production)
      const res = await fetch(`/api/games`);
      const data = await res.json();
      if (data.success) {
        setGames(data.data || []);
      }
    } catch (error) {
      console.error("Error loading games:", error);
    }
  };

  useEffect(() => {
    if (showCreateModal) {
      loadGamesForLesson();
    }
  }, [showCreateModal]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSession),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Session đã được tạo thành công!");
        setShowCreateModal(false);
        setNewSession({
          class_id: "",
          game_id: "",
          title: "",
          description: "",
          duration_minutes: 60,
        });
        loadData();
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Lỗi khi tạo session");
      console.error(error);
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    if (
      !confirm(
        "Đóng session này? Học sinh sẽ không thể nộp bài nữa.\n\nBạn có chắc chắn không?",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/sessions/${sessionId}/close`, {
        method: "PUT",
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Session đã được đóng!");
        loadData();
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Lỗi khi đóng session");
      console.error(error);
    }
  };

  const handleDeleteSession = async (
    sessionId: number,
    sessionTitle: string,
  ) => {
    if (
      !confirm(
        `⚠️ XÓA VĨNH VIỄN SESSION "${sessionTitle}"?\n\nTất cả dữ liệu sẽ bị xóa không thể khôi phục:\n• Tất cả bài nộp của học sinh\n• Thống kê và điểm số\n• Lịch sử hoạt động\n\n❌ HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!\n\nBạn có CHẮC CHẮN muốn xóa không?`,
      )
    ) {
      return;
    }

    // Double confirmation for safety
    if (
      !confirm(
        `🚨 XÁC NHẬN LẦN CUỐI!\n\nBạn THỰC SỰ muốn xóa session "${sessionTitle}" và toàn bộ dữ liệu?\n\nGõ "DELETE" để xác nhận hoặc Cancel để hủy.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/sessions/${sessionId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Session đã được xóa thành công!");
        loadData(); // Reload the sessions list
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Lỗi khi xóa session");
      console.error(error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeDiff = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const diffMinutes = Math.floor((end - start) / 1000 / 60);

    if (diffMinutes < 60) return `${diffMinutes} phút`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/teacher"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Quay lại
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📝</span>
                Quản lý Sessions
              </h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg font-medium"
            >
              ➕ Tạo Session Mới
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex gap-2">
            {(["all", "active", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
                  filter === f
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                {f === "all"
                  ? "Tất cả"
                  : f === "active"
                    ? "🟢 Đang mở"
                    : "⚫ Đã đóng"}
              </button>
            ))}
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">🏫 Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Tổng sessions</div>
            <div className="text-3xl font-bold text-gray-900">
              {sessions.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Đang active</div>
            <div className="text-3xl font-bold text-green-600">
              {sessions.filter((s) => s.status === "active").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Học sinh đã nộp</div>
            <div className="text-3xl font-bold text-blue-600">
              {sessions.reduce((sum, s) => sum + s.unique_submitters, 0)}
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Chưa có session nào
              </h3>
              <p className="text-gray-500 mb-6">
                Tạo session để mở nộp bài cho học sinh
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                ➕ Tạo Session Đầu Tiên
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {session.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            session.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {session.status === "active"
                            ? "🟢 Đang mở"
                            : "⚫ Đã đóng"}
                        </span>
                      </div>

                      {session.description && (
                        <p className="text-gray-600 mb-3">
                          {session.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Lớp:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {session.class_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Game:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {session.game_title}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bắt đầu:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {formatDate(session.started_at)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Thời gian:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {getTimeDiff(session.started_at, session.closed_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-2xl">👥</span>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {session.unique_submitters}
                          </div>
                          <div className="text-xs text-gray-500">học sinh đã nộp</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/teacher/sessions/${session.id}/submissions`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-2"
                      >
                        📋 Xem bài nộp
                      </Link>
                      {session.status === "active" && (
                        <button
                          onClick={() => handleCloseSession(session.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-2"
                        >
                          🔒 Đóng session
                        </button>
                      )}
                      {/* Delete button - shown for closed sessions or admins */}
                      {(session.status === "closed" ||
                        session.total_submissions === 0) && (
                        <button
                          onClick={() =>
                            handleDeleteSession(session.id, session.title)
                          }
                          className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition font-medium flex items-center gap-2"
                          title="Xóa vĩnh viễn session này và tất cả dữ liệu liên quan"
                        >
                          🗑️ Xóa session
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">
                ➕ Tạo Session Mới
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Mở session để học sinh có thể nộp bài
              </p>
            </div>

            <form onSubmit={handleCreateSession} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lớp học <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSession.class_id}
                  onChange={(e) =>
                    setNewSession({ ...newSession, class_id: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Chọn lớp học...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Chỉ học sinh trong lớp này mới có thể nộp bài
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Game <span className="text-red-500">*</span>
                </label>
                <select
                  value={newSession.game_id}
                  onChange={(e) =>
                    setNewSession({ ...newSession, game_id: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="">Chọn game...</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tiêu đề session <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) =>
                    setNewSession({ ...newSession, title: e.target.value })
                  }
                  required
                  placeholder="VD: Luyện tập String Reverse - Tiết 1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={newSession.description}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Ghi chú thêm về session này..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Thời gian tự động đóng (phút)
                </label>
                <input
                  type="number"
                  value={newSession.duration_minutes}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      duration_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                  min={10}
                  max={180}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Session sẽ tự động đóng sau thời gian này, hoặc bạn có thể
                  đóng thủ công bất kỳ lúc nào
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition shadow-md hover:shadow-lg"
                >
                  ✅ Tạo Session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSession({
                      class_id: "",
                      game_id: "",
                      title: "",
                      description: "",
                      duration_minutes: 60,
                    });
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
