"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Game {
  id: number;
  title: string;
  game_type: string;
  lesson_title: string;
  topic_title: string;
  course_title: string;
}

interface Session {
  id: number;
  lesson_id: number;
  game_id: number;
  lesson_title: string;
  game_title: string;
  session_code: string;
  is_active: boolean;
  expires_at: string;
  submission_count: number;
  created_at: string;
}

interface SessionSubmission {
  rank_position: number;
  username: string;
  full_name: string;
  score: number;
  is_correct: boolean;
  submitted_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function TeacherSessionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [rankings, setRankings] = useState<SessionSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Create session modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto refresh rankings every 5 seconds when viewing active session
  useEffect(() => {
    if (activeSession && activeSession.is_active) {
      const interval = setInterval(() => {
        fetchSessionRankings(activeSession.session_code);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "teacher" && data.user.role !== "admin") {
        router.push("/");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch games
      const gamesRes = await fetch("/api/games");
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData.data || []);
      }

      // Fetch sessions
      const sessionsRes = await fetch("/api/sessions");
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionRankings = async (code: string) => {
    try {
      const res = await fetch(`/api/sessions/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRankings(data.data.rankings || []);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedGameId) {
      alert("Vui lòng chọn game");
      return;
    }

    setCreating(true);

    try {
      const game = games.find((g) => g.id === selectedGameId);
      if (!game) throw new Error("Game not found");

      // We need to get lesson_id from game - assuming game has lesson_id
      // For now, we'll create a simple workaround
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: 1, // This needs to be properly connected
          gameId: selectedGameId,
          durationMinutes: duration,
        }),
      });

      if (!res.ok) throw new Error("Lỗi tạo session");

      const data = await res.json();
      setActiveSession(data.data);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Có lỗi xảy ra");
    } finally {
      setCreating(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/sessions/${activeSession.session_code}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Lỗi đóng session");

      setActiveSession(null);
      setRankings([]);
      fetchData();
    } catch (error) {
      console.error("Error closing session:", error);
    }
  };

  const viewSession = async (session: Session) => {
    setActiveSession(session);
    await fetchSessionRankings(session.session_code);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN");
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const end = new Date(expiresAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Đã hết hạn";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher" className="text-gray-400 hover:text-white">
                ← Quay lại
              </Link>
              <h1 className="text-xl font-bold text-white">
                📊 Nộp bài trực tiếp
              </h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ➕ Mở session mới
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Session */}
        {activeSession && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 mb-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {activeSession.game_title}
                </h2>
                <p className="text-gray-400">{activeSession.lesson_title}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-bold text-yellow-400 mb-1">
                  {activeSession.session_code}
                </div>
                <div className="text-sm text-gray-400">Mã để học sinh nhập</div>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {rankings.length}
                </div>
                <div className="text-sm text-gray-400">Đã nộp</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {rankings.filter((r) => r.is_correct).length}
                </div>
                <div className="text-sm text-gray-400">Đúng</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {getTimeRemaining(activeSession.expires_at)}
                </div>
                <div className="text-sm text-gray-400">Còn lại</div>
              </div>
              <div className="flex-1"></div>
              <button
                onClick={handleCloseSession}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                🔒 Đóng session
              </button>
            </div>

            {/* Live Rankings */}
            <div className="bg-black/20 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium w-16">
                      Hạng
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Học sinh
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Điểm
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Kết quả
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rankings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        Chưa có ai nộp bài. Chia sẻ mã{" "}
                        <span className="text-yellow-400 font-bold">
                          {activeSession.session_code}
                        </span>{" "}
                        cho học sinh!
                      </td>
                    </tr>
                  ) : (
                    rankings.map((entry) => (
                      <tr key={entry.username} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          {entry.rank_position === 1 ? (
                            <span className="text-2xl">🥇</span>
                          ) : entry.rank_position === 2 ? (
                            <span className="text-2xl">🥈</span>
                          ) : entry.rank_position === 3 ? (
                            <span className="text-2xl">🥉</span>
                          ) : (
                            <span className="text-white font-bold">
                              {entry.rank_position}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          {entry.full_name || entry.username}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${
                              entry.score >= 80
                                ? "text-green-400"
                                : entry.score >= 50
                                  ? "text-yellow-400"
                                  : "text-red-400"
                            }`}
                          >
                            {entry.score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {entry.is_correct ? (
                            <span className="text-green-400">✅</span>
                          ) : (
                            <span className="text-red-400">❌</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {formatDate(entry.submitted_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Past Sessions */}
        <div className="bg-white/5 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Lịch sử sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Chưa có session nào
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    session.is_active &&
                    new Date(session.expires_at) > new Date()
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-white/5"
                  }`}
                >
                  <div>
                    <div className="text-white font-medium">
                      {session.game_title}
                    </div>
                    <div className="text-sm text-gray-400">
                      {session.lesson_title} • Mã: {session.session_code}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-white">
                        {session.submission_count || 0} bài nộp
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(session.created_at)}
                      </div>
                    </div>
                    {session.is_active &&
                      new Date(session.expires_at) > new Date() && (
                        <button
                          onClick={() => viewSession(session)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          Xem
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              Mở session nộp bài
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Chọn Game
                </label>
                <select
                  value={selectedGameId || ""}
                  onChange={(e) =>
                    setSelectedGameId(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-[#1a1a2e]">
                    Chọn game...
                  </option>
                  {games.map((game) => (
                    <option
                      key={game.id}
                      value={game.id}
                      className="bg-[#1a1a2e]"
                    >
                      {game.title} ({game.game_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Thời gian (phút)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateSession}
                disabled={creating}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Tạo session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
