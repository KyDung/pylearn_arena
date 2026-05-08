"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Contest {
  id: number;
  title: string;
  description: string;
  contest_code: string;
  creator_name?: string;
  class_name?: string;
  course_title?: string;
  status: "draft" | "active" | "closed";
  start_time: string | null;
  end_time: string | null;
  show_ranking: boolean;
  game_count: number;
  my_submission_count: number;
}

export default function StudentContestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user.role === "student") {
        await fetchContests();
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchContests = async () => {
    try {
      const res = await fetch("/api/student/contests/active");
      const data = await res.json();
      if (data.success) {
        setContests(data.data?.contests || []);
      }
    } catch (err) {
      console.error("Error fetching contests:", err);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      setError("Vui lòng nhập mã cuộc thi");
      return;
    }

    try {
      const res = await fetch(`/api/contests/join?code=${joinCode.trim()}`);
      const data = await res.json();
      if (data.success) {
        router.push(`/student/contests/${data.data.contestId}`);
      } else {
        setError(data.error || "Không tìm thấy cuộc thi");
      }
    } catch {
      setError("Lỗi kết nối server");
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Không giới hạn";
    return new Date(dateStr).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (endTime: string | null) => {
    if (!endTime) return null;
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Đã hết giờ";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m còn lại`;
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
                href="/"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Trang chủ
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">🏆</span>
                Cuộc thi
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Join by code */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 Tham gia bằng mã cuộc thi
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="Nhập mã cuộc thi (VD: ABC123)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              maxLength={10}
            />
            <button
              onClick={handleJoinByCode}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Tham gia
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Active contests */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          📋 Cuộc thi đang diễn ra
        </h2>

        {contests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không có cuộc thi nào
            </h3>
            <p className="text-gray-600">
              Hiện tại chưa có cuộc thi nào đang diễn ra. Hãy nhập mã cuộc thi
              nếu bạn có.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {contests.map((contest) => (
              <div
                key={contest.id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🏆</span>
                        <h3 className="text-xl font-bold text-gray-900">
                          {contest.title}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Đang diễn ra
                        </span>
                      </div>

                      {contest.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {contest.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {contest.class_name && (
                          <span className="flex items-center gap-1">
                            📚 {contest.class_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          🎮 {contest.game_count} bài
                        </span>
                        {contest.end_time && (
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            ⏰ {getTimeRemaining(contest.end_time)}
                          </span>
                        )}
                        {contest.my_submission_count > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            ✅ Đã nộp {contest.my_submission_count} lần
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Link
                        href={`/student/contests/${contest.id}`}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition shadow-md hover:shadow-lg inline-block"
                      >
                        Vào thi →
                      </Link>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Bắt đầu:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatDateTime(contest.start_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Kết thúc:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formatDateTime(contest.end_time)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
