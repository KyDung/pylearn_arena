"use client";

import { usePageUser } from "@/hooks/usePageUser";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { preloadLocalPyodide } from "@/lib/pyodideLoader";

interface ActiveSession {
  id: number;
  title: string;
  description: string;
  class_id: number;
  class_name: string;
  game_id: number;
  game_title: string;
  game_path: string;
  started_at: string;
  duration_minutes: number | null;
  auto_close?: boolean;
  remaining_minutes?: number;
}

interface ActiveSessionFromApi extends Omit<ActiveSession, "remaining_minutes"> {
  remaining_minutes?: number | string | null;
}

interface ActiveSessionsResponse {
  success?: boolean;
  data?: ActiveSessionFromApi[];
}

const parseRemainingMinutes = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

export default function StudentSessionsPage() {
  const router = useRouter();
  const user = usePageUser("student");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);

  useEffect(() => {
    if (!loading && sessions.length > 0) {
      preloadLocalPyodide();
    }
  }, [loading, sessions.length]);

  const fetchActiveSessions = useCallback(() => {
    return fetch("/api/student/sessions/active").then(async (res) => {
      const data = (await res.json()) as ActiveSessionsResponse;
      if (data.success) {
        // Ensure remaining_minutes is a number
        const sessions = (data.data || []).map((session) => ({
          ...session,
          remaining_minutes: parseRemainingMinutes(session.remaining_minutes),
        }));
        setSessions(sessions);
      }
    }).catch((error) => {
      console.error("Error fetching sessions:", error);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) void fetchActiveSessions();
  }, [user, fetchActiveSessions]);

  const joinSession = (session: ActiveSession) => {
    // Redirect to play page with session context
    router.push(
      `/play?path=${encodeURIComponent(session.game_path)}&sessionId=${session.id}`,
    );
  };

  const formatTimeRemaining = (remainingMinutes?: number) => {
    if (
      remainingMinutes === undefined ||
      remainingMinutes === null ||
      remainingMinutes <= 0
    ) {
      return "Đã hết hạn";
    }
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Sessions đang hoạt động
          </h1>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có session nào
              </h3>
              <p className="text-gray-500">
                Các session do giáo viên tạo sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {session.title}
                    </h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Đang hoạt động
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>
                      <span className="font-medium">Lớp:</span>{" "}
                      {session.class_name}
                    </p>
                    <p>
                      <span className="font-medium">Game:</span>{" "}
                      {session.game_title}
                    </p>
                    <p>
                      <span className="font-medium">Thời gian còn lại:</span>{" "}
                      <span className="text-red-600 font-medium">
                          {session.auto_close === false || session.duration_minutes === null
                            ? "Đến khi giáo viên đóng phiên"
                            : formatTimeRemaining(session.remaining_minutes)}
                      </span>
                    </p>
                    {session.description && (
                      <p>
                        <span className="font-medium">Mô tả:</span>{" "}
                        {session.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => joinSession(session)}
                      disabled={
                        session.auto_close !== false && session.duration_minutes !== null &&
                        (!session.remaining_minutes || session.remaining_minutes <= 0)
                    }
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                      {session.auto_close !== false && session.duration_minutes !== null &&
                      (!session.remaining_minutes || session.remaining_minutes <= 0)
                      ? "Đã hết hạn"
                      : "Tham gia ngay"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">💡 Hướng dẫn:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Sessions sẽ tự động hiển thị khi giáo viên mở</li>
              <li>• Click &quot;Tham gia ngay&quot; để vào làm bài ngay lập tức</li>
              <li>• Không cần nhập mã session nào cả!</li>
              <li>• Kết quả sẽ được gửi tự động khi nộp bài</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
