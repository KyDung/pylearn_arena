"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Contest {
  id: number;
  title: string;
  description: string;
  contest_code: string;
  creator_name?: string;
  class_name?: string;
  show_ranking: boolean;
  allow_resubmit: boolean;
  max_attempts: number | null;
  start_time: string | null;
  end_time: string | null;
}

interface ContestGame {
  id: number;
  game_id: number;
  game_title: string;
  game_path: string;
  game_type?: string;
  isCompleted: boolean;
  myBestScore: number;
  myAttempts: number;
}

interface Ranking {
  user_id: number;
  username: string;
  full_name: string;
  total_score: number;
  games_completed: number;
  total_games: number;
  rank_position: number;
}

interface MyProgress {
  completedGames: number;
  totalGames: number;
  totalScore: number;
}

export default function StudentContestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contestId = params.contestId as string;

  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<Contest | null>(null);
  const [games, setGames] = useState<ContestGame[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myProgress, setMyProgress] = useState<MyProgress | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"games" | "rankings">("games");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, [contestId]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user.role === "student") {
        setCurrentUserId(data.user.id);
        await fetchContestDetail();
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchContestDetail = async () => {
    try {
      const res = await fetch(`/api/student/contests/${contestId}`);
      const data = await res.json();

      if (data.success) {
        setContest(data.data.contest);
        setGames(data.data.games || []);
        setRankings(data.data.rankings || []);
        setMyProgress(data.data.myProgress);
      } else {
        setError(data.error || "Không thể tải cuộc thi");
      }
    } catch (err) {
      setError("Lỗi kết nối server");
    }
  };

  const getTimeRemaining = () => {
    if (!contest?.end_time) return null;
    const end = new Date(contest.end_time).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Đã hết giờ";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (contest?.end_time) {
      const timer = setInterval(() => {
        setTimeRemaining(getTimeRemaining());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [contest]);

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

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Không tìm thấy cuộc thi"}
          </h3>
          <Link
            href="/student/contests"
            className="text-blue-600 hover:text-blue-700"
          >
            ← Quay lại danh sách
          </Link>
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
                href="/student/contests"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Quay lại
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  {contest.title}
                </h1>
                {contest.class_name && (
                  <p className="text-sm text-gray-600">
                    📚 {contest.class_name}
                  </p>
                )}
              </div>
            </div>

            {/* Timer */}
            {contest.end_time && timeRemaining && (
              <div
                className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                  timeRemaining === "Đã hết giờ"
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                ⏰ {timeRemaining}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Progress */}
        {myProgress && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Tiến độ của bạn
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {myProgress.completedGames}/{myProgress.totalGames}
                </div>
                <div className="text-sm text-gray-600">Bài hoàn thành</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {myProgress.totalScore}
                </div>
                <div className="text-sm text-gray-600">Tổng điểm</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(
                    (myProgress.completedGames / myProgress.totalGames) * 100,
                  )}
                  %
                </div>
                <div className="text-sm text-gray-600">Hoàn thành</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{
                    width: `${(myProgress.completedGames / myProgress.totalGames) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("games")}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === "games"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            🎮 Danh sách bài ({games.length})
          </button>
          {contest.show_ranking && (
            <button
              onClick={() => setActiveTab("rankings")}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                activeTab === "rankings"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              🏅 Bảng xếp hạng
            </button>
          )}
        </div>

        {/* Games List */}
        {activeTab === "games" && (
          <div className="grid gap-4">
            {games.map((game, index) => (
              <div
                key={game.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition ${
                  game.isCompleted ? "border-l-4 border-green-500" : ""
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                          game.isCompleted
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {game.isCompleted ? "✓" : index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {game.game_title}
                        </h3>
                        <div className="flex gap-4 text-sm text-gray-600">
                          {game.myAttempts > 0 && (
                            <>
                              <span>📝 {game.myAttempts} lần nộp</span>
                              <span>🎯 Điểm cao nhất: {game.myBestScore}</span>
                            </>
                          )}
                          {game.isCompleted && (
                            <span className="text-green-600 font-medium">
                              ✅ Đã hoàn thành
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/play?path=${encodeURIComponent(game.game_path)}&contestId=${contestId}&gameId=${game.game_id}`}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition shadow-md hover:shadow-lg"
                    >
                      {game.isCompleted ? "Làm lại" : "Làm bài"} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rankings */}
        {activeTab === "rankings" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Hạng
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Học sinh
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Bài hoàn thành
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Tổng điểm
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rankings.map((r, index) => (
                  <tr
                    key={r.user_id}
                    className={`${
                      r.user_id === currentUserId
                        ? "bg-blue-50"
                        : index % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                    } hover:bg-blue-50 transition`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          r.rank_position === 1
                            ? "bg-yellow-400 text-yellow-900"
                            : r.rank_position === 2
                              ? "bg-gray-300 text-gray-800"
                              : r.rank_position === 3
                                ? "bg-orange-300 text-orange-900"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.rank_position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {r.full_name || r.username}
                        {r.user_id === currentUserId && (
                          <span className="ml-2 text-blue-600 text-sm">
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">@{r.username}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">
                        {r.games_completed}/{r.total_games}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-lg text-blue-600">
                        {r.total_score}
                      </span>
                    </td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Chưa có ai nộp bài
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
