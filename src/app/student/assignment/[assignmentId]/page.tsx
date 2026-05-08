"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Assignment {
  id: number;
  title: string;
  description: string;
  class_id: number;
  class_name: string;
  game_id: number;
  game_title: string;
  game_path: string;
  start_time: string;
  end_time: string;
  late_submission: boolean;
  late_penalty: number;
  max_attempts: number | null;
  show_ranking: boolean;
  status: string;
}

interface Submission {
  id: number;
  score: number;
  is_correct: boolean;
  submitted_at: string;
  execution_time: number;
  is_late: boolean;
  attempt_number: number;
}

interface RankingEntry {
  rank_position: number;
  username: string;
  full_name: string;
  best_score: number;
  total_attempts: number;
  first_passed_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"game" | "history" | "ranking">(
    "game",
  );
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAssignment();
    }
  }, [user, resolvedParams.assignmentId]);

  useEffect(() => {
    if (assignment) {
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [assignment]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "student") {
        router.push("/");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    }
  };

  const fetchAssignment = async () => {
    try {
      const res = await fetch(
        `/api/assignments/${resolvedParams.assignmentId}`,
      );
      if (!res.ok) throw new Error("Không tìm thấy bài tập");
      const data = await res.json();
      setAssignment(data.data.assignment);
      setSubmissions(data.data.submissions || []);
      setRankings(data.data.rankings || []);

      // Check if can submit
      const now = new Date();
      const start = new Date(data.data.assignment.start_time);
      const end = new Date(data.data.assignment.end_time);
      const isInTime = now >= start && now <= end;
      const hasAttempts =
        !data.data.assignment.max_attempts ||
        (data.data.submissions?.length || 0) <
          data.data.assignment.max_attempts;
      setCanSubmit(
        isInTime && hasAttempts && data.data.assignment.status === "published",
      );
    } catch (error) {
      console.error("Error fetching assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeLeft = () => {
    if (!assignment) return;

    const now = new Date();
    const start = new Date(assignment.start_time);
    const end = new Date(assignment.end_time);

    if (now < start) {
      const diff = start.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`Bắt đầu sau: ${hours}h ${minutes}m ${seconds}s`);
    } else if (now <= end) {
      const diff = end.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`Còn lại: ${hours}h ${minutes}m ${seconds}s`);
    } else {
      setTimeLeft("Đã hết hạn");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN");
  };

  const getStatusBadge = () => {
    const now = new Date();
    const start = new Date(assignment!.start_time);
    const end = new Date(assignment!.end_time);

    if (now < start) {
      return (
        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
          Chưa bắt đầu
        </span>
      );
    } else if (now <= end) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
          Đang mở
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
          Đã kết thúc
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Không tìm thấy bài tập
          </h1>
          <Link href="/student" className="text-blue-400 hover:underline">
            ← Quay lại
          </Link>
        </div>
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
              <h1 className="text-xl font-bold text-white">
                {assignment.title}
              </h1>
              {getStatusBadge()}
            </div>
            <div className="text-lg font-mono text-yellow-400">{timeLeft}</div>
          </div>
        </div>
      </header>

      {/* Assignment Info */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white/5 rounded-xl p-6 mb-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-400 text-sm">Lớp:</span>
              <p className="text-white font-medium">{assignment.class_name}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Thời gian bắt đầu:</span>
              <p className="text-white font-medium">
                {formatDate(assignment.start_time)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Thời gian kết thúc:</span>
              <p className="text-white font-medium">
                {formatDate(assignment.end_time)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Số lần nộp:</span>
              <p className="text-white font-medium">
                {submissions.length}
                {assignment.max_attempts
                  ? ` / ${assignment.max_attempts}`
                  : " (không giới hạn)"}
              </p>
            </div>
          </div>
          {assignment.description && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <span className="text-gray-400 text-sm">Mô tả:</span>
              <p className="text-white mt-1">{assignment.description}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("game")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "game"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            🎮 Làm bài
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            📝 Lịch sử ({submissions.length})
          </button>
          {assignment.show_ranking && (
            <button
              onClick={() => setActiveTab("ranking")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "ranking"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-gray-400 hover:text-white"
              }`}
            >
              🏆 Xếp hạng
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "game" && (
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {canSubmit ? (
              <div className="aspect-video relative">
                <iframe
                  src={`/play?game=${assignment.game_path}&assignment=${assignment.id}`}
                  className="w-full h-full absolute inset-0"
                  allow="fullscreen"
                />
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {new Date() < new Date(assignment.start_time)
                      ? "Bài tập chưa bắt đầu"
                      : new Date() > new Date(assignment.end_time)
                        ? "Bài tập đã kết thúc"
                        : assignment.max_attempts &&
                            submissions.length >= assignment.max_attempts
                          ? "Đã hết lượt nộp"
                          : "Không thể làm bài"}
                  </h3>
                  <p className="text-gray-400">
                    {new Date() < new Date(assignment.start_time)
                      ? `Bắt đầu lúc ${formatDate(assignment.start_time)}`
                      : new Date() > new Date(assignment.end_time)
                        ? "Bạn có thể xem lịch sử nộp bài"
                        : "Liên hệ giáo viên nếu cần hỗ trợ"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {submissions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-400">Chưa có bài nộp nào</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Lần
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Thời gian
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Điểm
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Kết quả
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Thời gian chạy
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-white">
                        #{sub.attempt_number}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {formatDate(sub.submitted_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${sub.score >= 80 ? "text-green-400" : sub.score >= 50 ? "text-yellow-400" : "text-red-400"}`}
                        >
                          {sub.score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.is_correct ? (
                          <span className="text-green-400">✅ Đạt</span>
                        ) : (
                          <span className="text-red-400">❌ Chưa đạt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {sub.execution_time ? `${sub.execution_time}ms` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {sub.is_late && (
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                            Nộp muộn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "ranking" && (
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {rankings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <p className="text-gray-400">Chưa có xếp hạng</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium w-16">
                      Hạng
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Học sinh
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Điểm cao nhất
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Số lần nộp
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Thời gian đạt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rankings.map((entry) => (
                    <tr
                      key={entry.username}
                      className={`hover:bg-white/5 ${entry.username === user?.username ? "bg-blue-500/10" : ""}`}
                    >
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {entry.full_name || entry.username}
                          </span>
                          {entry.username === user?.username && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${entry.best_score >= 80 ? "text-green-400" : entry.best_score >= 50 ? "text-yellow-400" : "text-red-400"}`}
                        >
                          {entry.best_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {entry.total_attempts}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {entry.first_passed_at
                          ? formatDate(entry.first_passed_at)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
