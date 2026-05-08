"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  code: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  is_correct: boolean;
  execution_time: number | null;
  error_message: string | null;
  submitted_at: string;
  attempt_number: number;
  ranking: number;
  total_attempts?: number;
}

interface Session {
  id: number;
  title: string;
  description: string;
  class_name: string;
  game_title: string;
  started_at: string;
  closed_at: string | null;
  duration_minutes: number;
  status: "active" | "closed";
  total_submissions: number;
  unique_submitters: number;
}

export default function SessionSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [viewingAllSubmissions, setViewingAllSubmissions] = useState<{
    [userId: number]: Submission[];
  }>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch session details
      const sessionRes = await fetch(
        `/api/teacher/sessions?session_id=${sessionId}`,
      );
      if (!sessionRes.ok) throw new Error("Failed to fetch session");
      const sessionData = await sessionRes.json();
      // API returns { success: true, data: { sessions: [...] } }
      const sessions = sessionData.data?.sessions || sessionData.sessions || [];
      if (sessions.length > 0) {
        setSession(sessions[0]);
      }

      // Fetch submissions
      const submissionsRes = await fetch(
        `/api/teacher/sessions/${sessionId}/submissions`,
      );
      if (!submissionsRes.ok) {
        const errorText = await submissionsRes.text();
        console.error(
          "Submissions API Error:",
          submissionsRes.status,
          errorText,
        );
        throw new Error(
          `Failed to fetch submissions: ${submissionsRes.status} - ${errorText}`,
        );
      }
      const submissionsData = await submissionsRes.json();
      // API returns { success: true, data: { submissions: [...] } }
      const submissions =
        submissionsData.data?.submissions || submissionsData.submissions || [];

      console.log("Fetched submissions:", submissions);
      setSubmissions(submissions);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string, submissionId: number) => {
    try {
      let copySuccess = false;

      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          copySuccess = true;
        } catch (clipboardErr) {
          console.warn("Clipboard API failed, trying fallback:", clipboardErr);
        }
      }

      // Fallback for browsers without Clipboard API
      if (!copySuccess) {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          copySuccess = document.execCommand("copy");
        } catch (execErr) {
          console.error("execCommand copy failed:", execErr);
        }

        document.body.removeChild(textarea);
      }

      if (copySuccess) {
        setCopiedId(submissionId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fetchAllSubmissionsForUser = async (userId: number) => {
    try {
      const response = await fetch(
        `/api/teacher/sessions/${sessionId}/submissions/${userId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch all submissions");
      const data = await response.json();
      const allSubmissions = data.data?.submissions || data.submissions || [];

      setViewingAllSubmissions((prev) => ({
        ...prev,
        [userId]: allSubmissions,
      }));

      setExpandedUsers((prev) => new Set([...prev, userId]));
    } catch (err) {
      console.error("Error fetching all submissions:", err);
    }
  };

  const toggleViewAllSubmissions = (userId: number) => {
    if (expandedUsers.has(userId)) {
      // Collapse - remove from expanded users
      setExpandedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else {
      // Expand - fetch all submissions if not already fetched
      if (!viewingAllSubmissions[userId]) {
        fetchAllSubmissionsForUser(userId);
      } else {
        setExpandedUsers((prev) => new Set([...prev, userId]));
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Download functions
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadBestSubmission = (submission: Submission) => {
    const studentName = (submission.full_name || submission.username).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    const sessionTitle =
      session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "session";
    const timestamp = new Date().toISOString().split("T")[0];

    const content = `# Bài tốt nhất - ${submission.full_name || submission.username}
# Session: ${session?.title || "Unknown"}
# Điểm: ${submission.score}% (${submission.passed_tests}/${submission.total_tests} test cases)
# Nộp lúc: ${formatDate(submission.submitted_at)}
# Lần thử: ${submission.attempt_number}

${submission.code}`;

    downloadFile(
      content,
      `${sessionTitle}_${studentName}_best_${timestamp}.py`,
    );
  };

  const downloadAllSubmissionsForUser = async (submission: Submission) => {
    try {
      // Fetch all submissions if not already loaded
      if (!viewingAllSubmissions[submission.user_id]) {
        await fetchAllSubmissionsForUser(submission.user_id);
      }

      const allSubs = viewingAllSubmissions[submission.user_id] || [];
      const studentName = (submission.full_name || submission.username).replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const sessionTitle =
        session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "session";
      const timestamp = new Date().toISOString().split("T")[0];

      let content = `# Tất cả bài nộp - ${submission.full_name || submission.username}
# Session: ${session?.title || "Unknown"}
# Tổng số lần nộp: ${allSubs.length}
# Ngày tải: ${new Date().toLocaleString("vi-VN")}

`;

      allSubs.forEach((sub, index) => {
        content += `
${"=".repeat(80)}
# LẦN NỘP ${sub.attempt_number} ${sub.id === submission.id ? "(BÀI TỐT NHẤT)" : ""}
${"=".repeat(80)}
# Điểm: ${sub.score}% (${sub.passed_tests}/${sub.total_tests} test cases)
# Nộp lúc: ${formatDate(sub.submitted_at)}
${sub.error_message ? `# Lỗi: ${sub.error_message}` : ""}

${sub.code}

`;
      });

      downloadFile(
        content,
        `${sessionTitle}_${studentName}_all_${timestamp}.py`,
      );
    } catch (error) {
      console.error("Error downloading all submissions:", error);
    }
  };

  const downloadAllBestSubmissions = () => {
    const sessionTitle =
      session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "session";
    const timestamp = new Date().toISOString().split("T")[0];

    let content = `# Tất cả bài tốt nhất
# Session: ${session?.title || "Unknown"}
# Tổng số học sinh: ${submissions.length}
# Ngày tải: ${new Date().toLocaleString("vi-VN")}

`;

    submissions.forEach((submission, index) => {
      const studentName = submission.full_name || submission.username;
      content += `
${"=".repeat(80)}
# HỌC SINH ${index + 1}: ${studentName} (Xếp hạng #${submission.ranking})
${"=".repeat(80)}
# Điểm: ${submission.score}% (${submission.passed_tests}/${submission.total_tests} test cases)
# Nộp lúc: ${formatDate(submission.submitted_at)}
# Lần thử: ${submission.attempt_number}

${submission.code}

`;
    });

    downloadFile(
      content,
      `${sessionTitle}_all_best_submissions_${timestamp}.py`,
    );
  };

  const downloadAllSubmissions = async () => {
    const sessionTitle =
      session?.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "session";
    const timestamp = new Date().toISOString().split("T")[0];

    let content = `# Tất cả bài nộp của tất cả học sinh
# Session: ${session?.title || "Unknown"}
# Ngày tải: ${new Date().toLocaleString("vi-VN")}

`;

    try {
      // Fetch all submissions for all users
      for (const submission of submissions) {
        if (!viewingAllSubmissions[submission.user_id]) {
          await fetchAllSubmissionsForUser(submission.user_id);
        }
      }

      // Add all submissions to content
      submissions.forEach((submission, studentIndex) => {
        const studentName = submission.full_name || submission.username;
        const allSubs = viewingAllSubmissions[submission.user_id] || [
          submission,
        ];

        content += `
${"#".repeat(100)}
# HỌC SINH ${studentIndex + 1}: ${studentName} (Xếp hạng #${submission.ranking})
# Tổng số lần nộp: ${allSubs.length}
${"#".repeat(100)}

`;

        allSubs.forEach((sub) => {
          content += `
${"=".repeat(80)}
# LẦN NỘP ${sub.attempt_number} ${sub.id === submission.id ? "(BÀI TỐT NHẤT)" : ""}
${"=".repeat(80)}
# Điểm: ${sub.score}% (${sub.passed_tests}/${sub.total_tests} test cases)
# Nộp lúc: ${formatDate(sub.submitted_at)}
${sub.error_message ? `# Lỗi: ${sub.error_message}` : ""}

${sub.code}

`;
        });
      });

      downloadFile(
        content,
        `${sessionTitle}_all_submissions_complete_${timestamp}.py`,
      );
    } catch (error) {
      console.error("Error downloading all submissions:", error);
    }
  };

  // Get unique students
  const uniqueStudents = Array.from(
    new Map(
      submissions.map((s) => [s.user_id, s.full_name || s.username]),
    ).entries(),
  ).map(([id, name]) => ({ id, name }));

  // Filter submissions
  const filteredSubmissions =
    selectedStudent === "all"
      ? submissions
      : submissions.filter((s) => s.user_id.toString() === selectedStudent);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
          <p className="font-semibold mb-2">Lỗi</p>
          <p>{error}</p>
          <Link
            href="/teacher/sessions"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Quay lại danh sách sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-8 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/teacher/sessions"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Quay lại
                </Link>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {session?.title || "Chi tiết buổi học"}
              </h1>
              {session && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📚 {session.class_name}</span>
                  <span>•</span>
                  <span>🎮 {session.game_title}</span>
                  <span>•</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {session.status === "active" ? "🟢 Đang mở" : "🔴 Đã đóng"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {session && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">Tổng bài nộp</div>
                <div className="text-3xl font-bold text-blue-600">
                  {session.total_submissions}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">
                  Học sinh đã nộp
                </div>
                <div className="text-3xl font-bold text-purple-600">
                  {session.unique_submitters}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">
                  Điểm trung bình
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {submissions.length > 0
                    ? Math.round(
                        submissions.reduce((sum, s) => sum + s.score, 0) /
                          submissions.length,
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Lọc theo học sinh:
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả ({submissions.length})</option>
                  {uniqueStudents.map((student) => {
                    const count = submissions.filter(
                      (s) => s.user_id === student.id,
                    ).length;
                    return (
                      <option key={student.id} value={student.id}>
                        {student.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Bulk Download Buttons */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Tải tổng thể:
                </span>
                <button
                  onClick={downloadAllBestSubmissions}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-sm font-medium flex items-center gap-2"
                  title="Tải tất cả bài tốt nhất của tất cả học sinh"
                >
                  📥 Bài tốt nhất
                </button>
                <button
                  onClick={downloadAllSubmissions}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium flex items-center gap-2"
                  title="Tải tất cả bài nộp của tất cả học sinh"
                >
                  📦 Tất cả bài nộp
                </button>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 text-lg">Chưa có bài nộp nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Leaderboard Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🏆 Bảng xếp hạng
                </h3>
                <p className="text-gray-600 text-sm">
                  Sắp xếp theo tỉ lệ test cases đúng, thời gian nộp sớm hơn thì
                  được ưu tiên
                </p>
              </div>

              {filteredSubmissions.map((submission, index) => (
                <div
                  key={submission.id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border-l-4 ${
                    submission.ranking === 1
                      ? "border-yellow-400"
                      : submission.ranking === 2
                        ? "border-gray-400"
                        : submission.ranking === 3
                          ? "border-orange-400"
                          : "border-blue-200"
                  }`}
                >
                  <div className="p-6">
                    {/* Ranking Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Ranking Badge */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            submission.ranking === 1
                              ? "bg-yellow-100 text-yellow-700"
                              : submission.ranking === 2
                                ? "bg-gray-100 text-gray-700"
                                : submission.ranking === 3
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {submission.ranking === 1
                            ? "🥇"
                            : submission.ranking === 2
                              ? "🥈"
                              : submission.ranking === 3
                                ? "🥉"
                                : `#${submission.ranking}`}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {submission.full_name || submission.username}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Nộp lúc: {formatDate(submission.submitted_at)}
                            {submission.attempt_number > 1 && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                Lần {submission.attempt_number}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Score Display */}
                      <div className="text-right">
                        <div
                          className={`text-2xl font-bold mb-1 ${
                            submission.score >= 80
                              ? "text-green-600"
                              : submission.score >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {submission.score}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {submission.passed_tests}/{submission.total_tests}{" "}
                          tests
                          {submission.is_correct && (
                            <span className="ml-2 text-green-600">
                              ✓ Hoàn hảo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Test Results Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Kết quả test cases</span>
                        <span>
                          {submission.passed_tests}/{submission.total_tests}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            submission.score >= 80
                              ? "bg-green-500"
                              : submission.score >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${submission.score}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Code Display */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Code đã nộp:
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Bài tốt nhất
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          {/* Download Buttons */}
                          <button
                            onClick={() => downloadBestSubmission(submission)}
                            className="px-3 py-1 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                            title="Tải bài tốt nhất về máy"
                          >
                            📥 Tải bài tốt nhất
                          </button>

                          {submission.total_attempts &&
                            submission.total_attempts > 1 && (
                              <button
                                onClick={() =>
                                  downloadAllSubmissionsForUser(submission)
                                }
                                className="px-3 py-1 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
                                title="Tải tất cả các lần nộp của học sinh này"
                              >
                                📦 Tải tất cả ({submission.total_attempts} bài)
                              </button>
                            )}

                          {/* Show "View All Submissions" button if user has more than 1 attempt */}
                          {submission.total_attempts &&
                          submission.total_attempts > 1 ? (
                            <button
                              onClick={() =>
                                toggleViewAllSubmissions(submission.user_id)
                              }
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                            >
                              {expandedUsers.has(submission.user_id)
                                ? `🔼 Ẩn (${submission.total_attempts} bài)`
                                : `👁️ Xem các bài đã nộp (${submission.total_attempts} bài)`}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              Chỉ có 1 bài nộp
                            </span>
                          )}
                          <button
                            onClick={() =>
                              handleCopyCode(submission.code, submission.id)
                            }
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              copiedId === submission.id
                                ? "bg-green-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {copiedId === submission.id
                              ? "✓ Đã copy"
                              : "📋 Copy code"}
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                          {submission.code}
                        </pre>
                      </div>
                    </div>

                    {/* Display All Submissions when expanded */}
                    {expandedUsers.has(submission.user_id) &&
                      viewingAllSubmissions[submission.user_id] && (
                        <div className="mb-4 border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Tất cả bài nộp:
                          </h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {viewingAllSubmissions[submission.user_id].map(
                              (sub, idx) => (
                                <div
                                  key={sub.id}
                                  className={`border rounded-lg p-3 ${
                                    sub.id === submission.id
                                      ? "border-green-300 bg-green-50"
                                      : "border-gray-200 bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm">
                                      <span className="font-medium">
                                        Lần {sub.attempt_number}
                                      </span>
                                      <span className="ml-2 text-gray-600">
                                        {formatDate(sub.submitted_at)}
                                      </span>
                                      {sub.id === submission.id && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                          Bài tốt nhất
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm">
                                      <span
                                        className={`font-bold ${
                                          sub.score >= 80
                                            ? "text-green-600"
                                            : sub.score >= 60
                                              ? "text-yellow-600"
                                              : "text-red-600"
                                        }`}
                                      >
                                        {sub.score}%
                                      </span>
                                      <span className="ml-1 text-gray-600">
                                        ({sub.passed_tests}/{sub.total_tests})
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
                                    <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                                      {sub.code}
                                    </pre>
                                  </div>
                                  {sub.error_message && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                      <strong>Lỗi:</strong> {sub.error_message}
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Error Message if any */}
                    {submission.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-red-700 mb-1">
                          Lỗi thực thi:
                        </div>
                        <div className="text-sm text-red-600 font-mono">
                          {submission.error_message}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
