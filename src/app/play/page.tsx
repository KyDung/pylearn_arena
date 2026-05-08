"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import courses from "@/data/courses.json";
import type { Course, User } from "@/types";
import { getUser } from "@/lib/auth";

// Dynamic import for Pyodide to avoid SSR issues
const PlayGameContent = dynamic(() => import("@/components/PlayGameContent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12">
      Đang tải game...
    </div>
  ),
});

interface ActiveSession {
  id: number;
  title: string;
  description: string;
  class_id: number;
  class_name: string;
  game_id: number;
  game_title: string;
  started_at: string;
  duration_minutes: number;
}

export default function PlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pathParam = searchParams.get("path");
  const [effectivePathParam, setEffectivePathParam] = useState<string | null>(
    pathParam,
  );

  // Fetch game info from database instead of courses.json
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [gameInfoLoading, setGameInfoLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      const redirect = pathParam
        ? `/login?next=play&path=${encodeURIComponent(pathParam)}`
        : "/login";
      router.push(redirect);
    } else {
      setUser(currentUser);
      setLoading(false);
    }
  }, [router, pathParam]);

  // Fetch active sessions for student
  useEffect(() => {
    if (!user) return;

    const sessionId = searchParams.get("sessionId");

    const fetchActiveSessions = async () => {
      try {
        const res = await fetch("/api/student/sessions/active");
        const data = await res.json();
        if (data.success && data.data) {
          const sessions: ActiveSession[] = data.data;

          if (sessionId) {
            // Find specific session by ID
            const session = sessions.find((s) => s.id === parseInt(sessionId));
            if (session) {
              setActiveSession(session);
              // Dùng game_path từ session
              if ((session as any).game_path) {
                setEffectivePathParam((session as any).game_path);
              }
              return;
            }
          }

          if (pathParam && sessions.length > 0) {
            // Find session for this game path
            const session = sessions.find(
              (s) => (s as any).game_path === pathParam,
            );
            if (session) {
              setActiveSession(session);
            } else if (sessions.length > 0) {
              // Set first available session as fallback
              setActiveSession(sessions[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching active sessions:", error);
      }
    };

    fetchActiveSessions();
  }, [user, pathParam, searchParams]);

  // Fetch game info from API
  useEffect(() => {
    if (!effectivePathParam) return;

    const fetchGameInfo = async () => {
      try {
        setGameInfoLoading(true);
        const res = await fetch(
          `/api/games/info?path=${encodeURIComponent(effectivePathParam)}`,
        );
        const data = await res.json();

        if (data.success && data.data) {
          setGameInfo(data.data);
        } else {
          console.error("Failed to fetch game info:", data.error);
        }
      } catch (error) {
        console.error("Error fetching game info:", error);
      } finally {
        setGameInfoLoading(false);
      }
    };

    fetchGameInfo();
  }, [effectivePathParam]);

  const handleSubmitCode = async () => {
    if (!activeSession) return;

    // Get code from custom code editor
    const codeInput = document.querySelector(
      "#code-input",
    ) as HTMLTextAreaElement;
    if (!codeInput) {
      setSubmitError("Không tìm thấy code editor");
      return;
    }

    const code = codeInput.value;
    if (!code.trim()) {
      setSubmitError("Vui lòng nhập code trước khi nộp bài");
      return;
    }

    // Get test results from game
    const gameInstance = (window as any).gameInstance;
    if (!gameInstance || !gameInstance.getTestResults) {
      setSubmitError(
        "Vui lòng chạy code và kiểm tra test cases trước khi nộp bài!",
      );
      return;
    }

    const testResults = gameInstance.getTestResults();
    if (testResults.total === 0) {
      setSubmitError("Vui lòng chạy code để kiểm tra test cases trước!");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch(
        `/api/student/sessions/${activeSession.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            passed_tests: testResults.passed,
            total_tests: testResults.total,
            score: Math.round((testResults.passed / testResults.total) * 100),
          }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setSubmitError(data.error || "Có lỗi xảy ra khi nộp bài");
      }
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError("Không thể kết nối với server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (gameInfoLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin game...</p>
        </div>
      </main>
    );
  }

  if (!effectivePathParam || !gameInfo) {
    return (
      <main className="flex-1 px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-5 sm:p-6 rounded-lg">
            <p className="text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">
              Không tìm thấy nội dung. Vui lòng chọn lại bài học.
            </p>
            <Link
              href="/game"
              className="text-blue-600 hover:underline text-sm sm:text-base"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const gameTitle = gameInfo.game.title;
  const lessonTitle = gameInfo.lesson.title;
  const courseTitle = gameInfo.course.title;
  const backLink = `/lesson/${gameInfo.course.slug}/${gameInfo.lesson.id}`; // Quay về lesson
  const subtitle = [courseTitle, lessonTitle].filter(Boolean).join(" · ");

  return (
    <main className="flex-1">
      <section className="px-4 sm:px-6 lg:px-16 py-4 sm:py-6 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 break-words">
                {gameTitle}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 break-words">
                  {subtitle}
                </p>
              )}
              {activeSession && (
                <div className="mt-2 inline-flex items-center gap-2 px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">
                    Đang trong buổi học: {activeSession.title}
                  </span>
                  <span className="sm:hidden">
                    Buổi học: {activeSession.title}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {activeSession && (
                <button
                  onClick={handleSubmitCode}
                  disabled={submitting || submitSuccess}
                  className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    submitSuccess
                      ? "bg-green-500 text-white"
                      : submitting
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-105"
                  }`}
                >
                  {submitSuccess ? (
                    "✓ Đã nộp"
                  ) : submitting ? (
                    "Đang nộp..."
                  ) : (
                    <span className="hidden sm:inline">📤 Nộp bài</span>
                  )}
                  {submitting ? null : submitSuccess ? null : (
                    <span className="sm:hidden">📤</span>
                  )}
                </button>
              )}
              <Link
                href={backLink}
                className="px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Quay lại</span>
                <span className="sm:hidden">←</span>
              </Link>
            </div>
          </div>

          {submitError && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs sm:text-sm">
              ✓ Nộp bài thành công! Giáo viên sẽ xem và chấm điểm.
            </div>
          )}

          <PlayGameContent pathParam={effectivePathParam} />
        </div>
      </section>
    </main>
  );
}
