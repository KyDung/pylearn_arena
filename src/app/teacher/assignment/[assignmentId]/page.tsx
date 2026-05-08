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
  user_id: number;
  username: string;
  full_name: string;
  code: string;
  score: number;
  is_correct: boolean;
  submitted_at: string;
  execution_time: number;
  is_late: boolean;
  attempt_number: number;
  feedback: string;
  graded_at: string;
}

interface Stats {
  total_students: number;
  submitted_count: number;
  passed_count: number;
  average_score: number;
  best_score: number;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function TeacherAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submissions" | "stats">(
    "submissions",
  );
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [manualScore, setManualScore] = useState<number | null>(null);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAssignment();
    }
  }, [user, resolvedParams.assignmentId]);

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

  const fetchAssignment = async () => {
    try {
      const res = await fetch(
        `/api/assignments/${resolvedParams.assignmentId}`,
      );
      if (!res.ok) throw new Error("Không tìm thấy bài tập");
      const data = await res.json();
      setAssignment(data.data.assignment);
      setSubmissions(data.data.submissions || []);

      // Calculate stats
      if (data.data.submissions) {
        const subs = data.data.submissions as Submission[];
        const uniqueUsers = new Set(subs.map((s) => s.user_id));
        const passedUsers = new Set(
          subs.filter((s) => s.is_correct).map((s) => s.user_id),
        );
        const scores = subs.map((s) => s.score);

        setStats({
          total_students: data.data.class_members || 0,
          submitted_count: uniqueUsers.size,
          passed_count: passedUsers.size,
          average_score: scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
          best_score: scores.length ? Math.max(...scores) : 0,
        });
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;
    setGrading(true);

    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: manualScore ?? selectedSubmission.score,
          feedback,
        }),
      });

      if (!res.ok) throw new Error("Lỗi chấm điểm");

      await fetchAssignment();
      setSelectedSubmission(null);
      setFeedback("");
      setManualScore(null);
    } catch (error) {
      console.error("Error grading:", error);
      alert("Có lỗi xảy ra khi chấm điểm");
    } finally {
      setGrading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(
        `/api/assignments/${resolvedParams.assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: status === "published" ? "publish" : "close",
          }),
        },
      );

      if (!res.ok) throw new Error("Lỗi cập nhật trạng thái");
      await fetchAssignment();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Có lỗi xảy ra");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm">
            Nháp
          </span>
        );
      case "published":
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
            Đã mở
          </span>
        );
      case "closed":
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
            Đã đóng
          </span>
        );
      default:
        return null;
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
          <Link href="/teacher" className="text-blue-400 hover:underline">
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
              <Link href="/teacher" className="text-gray-400 hover:text-white">
                ← Quay lại
              </Link>
              <h1 className="text-xl font-bold text-white">
                {assignment.title}
              </h1>
              {getStatusBadge(assignment.status)}
            </div>
            <div className="flex items-center gap-2">
              {assignment.status === "draft" && (
                <button
                  onClick={() => handleStatusChange("published")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  📢 Mở bài tập
                </button>
              )}
              {assignment.status === "published" && (
                <button
                  onClick={() => handleStatusChange("closed")}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  🔒 Đóng bài tập
                </button>
              )}
              <Link
                href={`/teacher/assignment/${assignment.id}/edit`}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                ✏️ Sửa
              </Link>
            </div>
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
              <span className="text-gray-400 text-sm">Game:</span>
              <p className="text-white font-medium">{assignment.game_title}</p>
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
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">
                {stats.total_students}
              </div>
              <div className="text-gray-400 text-sm">Học sinh</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">
                {stats.submitted_count}
              </div>
              <div className="text-gray-400 text-sm">Đã nộp</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {stats.passed_count}
              </div>
              <div className="text-gray-400 text-sm">Đạt yêu cầu</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {stats.average_score}
              </div>
              <div className="text-gray-400 text-sm">Điểm TB</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {stats.best_score}
              </div>
              <div className="text-gray-400 text-sm">Điểm cao nhất</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "submissions"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            📝 Bài nộp ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "stats"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            📊 Thống kê
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "submissions" && (
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
                      Học sinh
                    </th>
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
                      Trạng thái
                    </th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {sub.full_name || sub.username}
                        </div>
                        <div className="text-gray-400 text-sm">
                          @{sub.username}
                        </div>
                      </td>
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {sub.is_late && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                              Muộn
                            </span>
                          )}
                          {sub.graded_at && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                              Đã chấm
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setFeedback(sub.feedback || "");
                            setManualScore(sub.score);
                          }}
                          className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition text-sm"
                        >
                          Xem & Chấm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Phân bố điểm
              </h3>
              <div className="space-y-3">
                {[
                  { label: "90-100", min: 90, max: 100, color: "bg-green-500" },
                  { label: "70-89", min: 70, max: 89, color: "bg-blue-500" },
                  { label: "50-69", min: 50, max: 69, color: "bg-yellow-500" },
                  { label: "< 50", min: 0, max: 49, color: "bg-red-500" },
                ].map((range) => {
                  const count = submissions.filter(
                    (s) => s.score >= range.min && s.score <= range.max,
                  ).length;
                  const percent = submissions.length
                    ? (count / submissions.length) * 100
                    : 0;
                  return (
                    <div key={range.label} className="flex items-center gap-3">
                      <span className="text-gray-400 w-16">{range.label}</span>
                      <div className="flex-1 h-6 bg-white/10 rounded overflow-hidden">
                        <div
                          className={`h-full ${range.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-white w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Tiến độ nộp bài
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#22c55e"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${((stats?.submitted_count || 0) / (stats?.total_students || 1)) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {stats?.total_students
                        ? Math.round(
                            (stats.submitted_count / stats.total_students) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">
                      Đã nộp: {stats?.submitted_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white/20 rounded-full"></div>
                    <span className="text-gray-300">
                      Chưa nộp:{" "}
                      {(stats?.total_students || 0) -
                        (stats?.submitted_count || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grade Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Bài nộp của{" "}
                {selectedSubmission.full_name || selectedSubmission.username}
              </h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Code */}
              <div>
                <h3 className="text-white font-medium mb-2">Code</h3>
                <pre className="bg-black/30 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto max-h-80">
                  {selectedSubmission.code || "Không có code"}
                </pre>
              </div>

              {/* Grade Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Điểm tự động
                    </label>
                    <p className="text-2xl font-bold text-white">
                      {selectedSubmission.score}
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">
                      Điểm thủ công
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={manualScore ?? ""}
                      onChange={(e) =>
                        setManualScore(
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Nhập điểm..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Nhận xét
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white resize-none"
                    placeholder="Nhập nhận xét cho học sinh..."
                  />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>
                    Thời gian chạy: {selectedSubmission.execution_time}ms
                  </span>
                  <span>Lần nộp: #{selectedSubmission.attempt_number}</span>
                  {selectedSubmission.is_late && (
                    <span className="text-orange-400">Nộp muộn</span>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleGrade}
                    disabled={grading}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {grading ? "Đang lưu..." : "Lưu đánh giá"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
