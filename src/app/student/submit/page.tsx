"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Session {
  id: number;
  lesson_id: number;
  game_id: number;
  lesson_title: string;
  game_title: string;
  game_path: string;
  session_code: string;
  expires_at: string;
}

interface Ranking {
  rank_position: number;
  user_id: number;
  username: string;
  full_name: string;
  score: number;
  is_correct: boolean;
  submitted_at: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

function StudentQuickSubmitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");

  const [user, setUser] = useState<User | null>(null);
  const [sessionCode, setSessionCode] = useState(codeParam || "");
  const [session, setSession] = useState<Session | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && codeParam) {
      joinSession(codeParam);
    }
  }, [user, codeParam]);

  useEffect(() => {
    if (session) {
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Auto refresh rankings
  useEffect(() => {
    if (session) {
      const interval = setInterval(() => {
        fetchRankings();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (code: string) => {
    setJoining(true);
    setError("");

    try {
      const res = await fetch(`/api/sessions/${code.toUpperCase()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Session không tồn tại");
      }

      const data = await res.json();
      setSession(data.data.session);
      setRankings(data.data.rankings || []);

      // Find user's rank
      if (user && data.data.rankings) {
        const myRank = data.data.rankings.find(
          (r: Ranking) => r.user_id === user.id,
        );
        setUserRank(myRank?.rank_position || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setJoining(false);
    }
  };

  const fetchRankings = useCallback(async () => {
    if (!session) return;

    try {
      const res = await fetch(`/api/sessions/${session.session_code}`);
      if (res.ok) {
        const data = await res.json();
        setRankings(data.data.rankings || []);
        if (user) {
          const myRank = data.data.rankings?.find(
            (r: Ranking) => r.user_id === user.id,
          );
          setUserRank(myRank?.rank_position || null);
        }
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
    }
  }, [session, user]);

  const updateTimeLeft = () => {
    if (!session) return;

    const now = new Date();
    const end = new Date(session.expires_at);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeLeft("Hết giờ!");
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim()) {
      joinSession(sessionCode.trim());
    }
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
              <Link href="/student" className="text-gray-400 hover:text-white">
                ← Quay lại
              </Link>
              <h1 className="text-xl font-bold text-white">📝 Nộp bài nhanh</h1>
            </div>
            {session && (
              <div className="text-lg font-mono text-yellow-400">
                {timeLeft}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!session ? (
          // Join Session Form
          <div className="bg-white/5 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              📢 Hệ thống mới!
            </h2>
            <p className="text-gray-300 mb-6">
              Giờ bạn không cần nhập mã session nữa! Sessions sẽ tự động hiển
              thị.
            </p>
            <Link
              href="/student/sessions"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📝 Xem Sessions mới →
            </Link>

            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Vẫn muốn dùng mã session? (Cũ)
              </h3>

              <h2 className="text-2xl font-bold text-white mb-2">
                Nhập mã session
              </h2>
              <p className="text-gray-400 mb-6">
                Nhập mã 6 ký tự mà giáo viên cung cấp để tham gia nộp bài
              </p>

              <form onSubmit={handleSubmit} className="max-w-xs mx-auto">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="VD: ABC123"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-2xl font-mono tracking-widest uppercase focus:border-blue-500 outline-none"
                  maxLength={6}
                />

                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

                <button
                  type="submit"
                  disabled={joining || sessionCode.length < 6}
                  className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {joining ? "Đang tham gia..." : "Tham gia"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          // Session View
          <div>
            {/* Session Info */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 mb-6 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {session.game_title}
                  </h2>
                  <p className="text-gray-400">{session.lesson_title}</p>
                </div>
                <div className="text-right">
                  {userRank ? (
                    <div>
                      <div className="text-sm text-gray-400">Hạng của bạn</div>
                      <div className="text-4xl font-bold text-yellow-400">
                        #{userRank}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400">Chưa nộp bài</div>
                  )}
                </div>
              </div>
            </div>

            {/* Game iframe */}
            <div className="bg-white/5 rounded-xl overflow-hidden mb-6">
              <div className="aspect-video relative">
                <iframe
                  src={`/play?game=${session.game_path}&session=${session.session_code}`}
                  className="w-full h-full absolute inset-0"
                  allow="fullscreen"
                />
              </div>
            </div>

            {/* Rankings */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                🏆 Bảng xếp hạng ({rankings.length} người)
              </h3>

              {rankings.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  Chưa có ai nộp bài
                </p>
              ) : (
                <div className="space-y-2">
                  {rankings.map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        user && entry.user_id === user.id
                          ? "bg-blue-600/20 border border-blue-500"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="w-12 text-center">
                        {entry.rank_position === 1 ? (
                          <span className="text-2xl">🥇</span>
                        ) : entry.rank_position === 2 ? (
                          <span className="text-2xl">🥈</span>
                        ) : entry.rank_position === 3 ? (
                          <span className="text-2xl">🥉</span>
                        ) : (
                          <span className="text-xl font-bold text-gray-400">
                            {entry.rank_position}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium">
                          {entry.full_name || entry.username}
                        </span>
                        {user && entry.user_id === user.id && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${
                            entry.score >= 80
                              ? "text-green-400"
                              : entry.score >= 50
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {entry.score}
                        </span>
                        {entry.is_correct && (
                          <span className="ml-2 text-green-400">✅</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentQuickSubmitPage() {
  return (
    <Suspense fallback={null}>
      <StudentQuickSubmitContent />
    </Suspense>
  );
}
