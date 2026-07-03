"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

interface CodingSetSubmission {
  type: "coding-set";
  answers: Array<{
    exerciseId: string;
    code: string;
  }>;
}

interface SubmissionFile {
  title: string;
  filenamePart: string;
  content: string;
}

const sanitizeFilePart = (value: string) => {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  return (
    ascii
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "file"
  );
};

const parseCodingSetSubmission = (code: string) => {
  try {
    const parsed = JSON.parse(code) as Partial<CodingSetSubmission>;
    if (parsed.type !== "coding-set" || !Array.isArray(parsed.answers)) {
      return null;
    }

    return parsed as CodingSetSubmission;
  } catch {
    return null;
  }
};

const getSubmissionFiles = (code: string): SubmissionFile[] => {
  const parsed = parseCodingSetSubmission(code);

  if (!parsed) {
    return [
      {
        title: "Bài làm",
        filenamePart: "bai-lam",
        content: code.trim() ? code : "# Chưa có code",
      },
    ];
  }

  if (parsed.answers.length === 0) {
    return [
      {
        title: "Container rỗng",
        filenamePart: "container-rong",
        content: "# Chưa có code",
      },
    ];
  }

  return parsed.answers.map((answer, index) => {
    const exerciseId =
      typeof answer?.exerciseId === "string" && answer.exerciseId.trim()
        ? answer.exerciseId.trim()
        : `bai-${index + 1}`;
    const exerciseCode =
      typeof answer?.code === "string" && answer.code.trim()
        ? answer.code
        : "# Chưa có code";

    return {
      title: `Bài ${index + 1}: ${exerciseId}`,
      filenamePart: `bai-${index + 1}-${sanitizeFilePart(exerciseId)}`,
      content: exerciseCode,
    };
  });
};

const formatSubmissionCode = (code: string) =>
  getSubmissionFiles(code)
    .map((file) => `# ${file.title}\n${file.content}`)
    .join("\n\n# ============================================================\n\n");

export default function SessionSubmissionsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSubmissionIds, setExpandedSubmissionIds] = useState<Set<number>>(
    new Set(),
  );

  const fetchData = useCallback(async () => {
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch data";
      console.error("Error fetching data:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSubmissionExpanded = (submissionId: number) => {
    setExpandedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  const handleCopyText = async (text: string, copyId: string) => {
    try {
      let copySuccess = false;

      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copySuccess = true;
        } catch (clipboardErr) {
          console.warn("Clipboard API failed, trying fallback:", clipboardErr);
        }
      }

      // Fallback for browsers without Clipboard API
      if (!copySuccess) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
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
        setCopiedId(copyId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyCode = (code: string, submissionId: number) =>
    handleCopyText(formatSubmissionCode(code), `submission-${submissionId}`);

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

  const buildSubmissionFileContent = (
    submission: Submission,
    file: SubmissionFile,
  ) => {
    const lines = [
      `# Học sinh: ${submission.full_name || submission.username}`,
      `# Session: ${session?.title || "Unknown"}`,
      `# Bài: ${file.title}`,
      `# Điểm tổng: ${submission.score}% (${submission.passed_tests}/${submission.total_tests} test cases)`,
      `# Nộp lúc: ${formatDate(submission.submitted_at)}`,
      submission.error_message ? `# Lỗi: ${submission.error_message}` : "",
      "",
      file.content,
    ];

    return lines.filter((line, index) => index >= 6 || line).join("\n");
  };

  const getDownloadBaseName = (submission: Submission) => {
    const studentName = sanitizeFilePart(
      submission.full_name || submission.username,
    );
    const sessionTitle = sanitizeFilePart(session?.title || "session");
    const timestamp = new Date().toISOString().split("T")[0];

    return `${sessionTitle}_${studentName}_${timestamp}`;
  };

  const downloadSubmissionFile = (
    submission: Submission,
    file: SubmissionFile,
  ) => {
    downloadFile(
      buildSubmissionFileContent(submission, file),
      `${getDownloadBaseName(submission)}_${file.filenamePart}.py`,
    );
  };

  const downloadSubmissionFiles = (submission: Submission) => {
    getSubmissionFiles(submission.code).forEach((file, index) => {
      window.setTimeout(() => downloadSubmissionFile(submission, file), index * 150);
    });
  };

  const downloadAllCurrentSubmissions = () => {
    let delay = 0;

    filteredSubmissions.forEach((submission) => {
      getSubmissionFiles(submission.code).forEach((file) => {
        window.setTimeout(
          () => downloadSubmissionFile(submission, file),
          delay,
        );
        delay += 150;
      });
    });
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
                  onClick={downloadAllCurrentSubmissions}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-medium flex items-center gap-2"
                  title="Tải bài nộp hiện tại của các học sinh đang hiển thị"
                >
                  📦 Tải tất cả bài làm
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

              {filteredSubmissions.map((submission) => {
                const files = getSubmissionFiles(submission.code);
                const isExpanded = expandedSubmissionIds.has(submission.id);

                return (
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
                      <button
                        type="button"
                        onClick={() => toggleSubmissionExpanded(submission.id)}
                        className="-m-2 flex min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-expanded={isExpanded}
                      >
                        {/* Ranking Badge */}
                        <div
                          className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg ${
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
                            <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {files.length} file
                            </span>
                            {submission.attempt_number > 1 && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                Lần {submission.attempt_number}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs font-medium text-blue-600">
                            {isExpanded
                              ? "Bấm để ẩn bài làm"
                              : "Bấm để xem bài làm"}
                          </p>
                        </div>
                      </button>

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
                    {isExpanded ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Code đã nộp:
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {files.length} file
                            </span>
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                toggleSubmissionExpanded(submission.id)
                              }
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                            >
                              Ẩn bài làm
                            </button>

                            <button
                              onClick={() => downloadSubmissionFiles(submission)}
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                              title="Tải bài làm về máy. Container sẽ được tách thành nhiều file."
                            >
                              📥 Tải bài làm
                            </button>

                            <button
                              onClick={() =>
                                handleCopyCode(submission.code, submission.id)
                              }
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                copiedId === `submission-${submission.id}`
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {copiedId === `submission-${submission.id}`
                                ? "✓ Đã copy"
                                : "📋 Copy tất cả"}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {files.map((file, fileIndex) => {
                            const copyKey = `submission-${submission.id}-file-${fileIndex}`;

                            return (
                              <div
                                key={`${file.filenamePart}-${fileIndex}`}
                                className="border border-gray-200 bg-gray-50 rounded-lg overflow-hidden"
                              >
                                <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white border-b border-gray-200">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-800 truncate">
                                      {file.title}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate">
                                      {file.filenamePart}.py
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() =>
                                        downloadSubmissionFile(submission, file)
                                      }
                                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                                    >
                                      Tải file
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCopyText(file.content, copyKey)
                                      }
                                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        copiedId === copyKey
                                          ? "bg-green-500 text-white"
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      }`}
                                    >
                                      {copiedId === copyKey ? "Đã copy" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                                <div className="p-4 max-h-60 overflow-y-auto">
                                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                                    {file.content}
                                  </pre>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSubmissionExpanded(submission.id)}
                        className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-left text-sm text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <span>
                          Đã nộp {files.length} file. Bấm để xem chi tiết bài
                          làm.
                        </span>
                        <span className="shrink-0 font-semibold">Xem</span>
                      </button>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
