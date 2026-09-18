"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import type { User } from "@/types";
import { getUser } from "@/lib/auth";
import { findPlaySession } from "@/lib/playSession";

const SESSION_SUBMIT_EVENT = "pylearn:submit-session";
const SESSION_SUBMIT_STATE_EVENT = "pylearn:session-submit-state";

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
  game_path?: string;
  has_submitted?: boolean;
}

interface GameInfo {
  game: { id: number; title: string; path: string };
  lesson: { id: number; title: string };
  course: { slug: string; title: string };
}

interface SessionGameInstance {
  prepareSubmission?: () => void | Promise<void>;
  canSubmit?: () => boolean;
  getIncompleteMessage?: () => string;
  getCode?: () => string;
  getScore?: () => number;
  getTestResults: () => {
    passed?: number;
    total?: number;
    passedTests?: number;
    totalTests?: number;
    score?: number;
  };
}

interface SessionSubmitPortalProps {
  active: boolean;
  submitting: boolean;
  submitted: boolean;
  pathKey: string | null;
  onSubmit: () => void;
}

function SessionSubmitPortal({
  active,
  submitting,
  submitted,
  pathKey,
  onSubmit,
}: SessionSubmitPortalProps) {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let slot: HTMLDivElement | null = null;

    const removeSlot = () => {
      if (slot?.parentElement) {
        slot.parentElement.removeChild(slot);
      }
      slot = null;
      setMountNode(null);
    };

    const attachSlot = () => {
      if (document.querySelector(".coding-set-shell")) {
        removeSlot();
        return;
      }

      const codeActions = document.querySelector<HTMLElement>(".code-actions");
      const codePanel = document.querySelector<HTMLElement>(".code-panel");
      const target = codeActions || codePanel;

      if (!target) return;

      const existing = target.querySelector<HTMLDivElement>(
        "[data-session-submit-slot='true']",
      );
      slot = existing || document.createElement("div");
      slot.dataset.sessionSubmitSlot = "true";
      slot.className = codeActions
        ? "session-submit-slot"
        : "session-submit-slot px-3 pb-3";

      if (!existing) {
        target.appendChild(slot);
      }

      setMountNode(slot);
    };

    attachSlot();

    const observer = new MutationObserver(attachSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    const intervalId = window.setInterval(attachSlot, 300);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      removeSlot();
    };
  }, [active, pathKey]);

  if (!active || !mountNode) return null;

  return createPortal(
    <button
      type="button"
      onClick={onSubmit}
      disabled={submitting || submitted}
      className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
        submitted
          ? "bg-green-500 text-white cursor-not-allowed"
          : submitting
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]"
      }`}
    >
      {submitted ? "Đã nộp bài" : submitting ? "Đang nộp bài..." : "Nộp bài"}
    </button>,
    mountNode,
  );
}

function PlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pathParam = searchParams.get("path");
  const sessionIdParam = searchParams.get("sessionId");
  const isSessionMode = sessionIdParam !== null;
  const contextKey = JSON.stringify([pathParam, sessionIdParam]);
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [effectivePathParam, setEffectivePathParam] = useState<string | null>(
    isSessionMode ? null : pathParam,
  );

  // Fetch game info from database instead of courses.json
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loadedGamePath, setLoadedGamePath] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      const params = new URLSearchParams({ next: "play" });
      if (pathParam) params.set("path", pathParam);
      if (sessionIdParam) params.set("sessionId", sessionIdParam);
      router.push(`/login?${params}`);
    } else {
      setUser(currentUser);
      setLoading(false);
    }
  }, [router, pathParam, sessionIdParam]);

  // Fetch active sessions for student
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchActiveSessions = async () => {
      try {
        const res = await fetch("/api/student/sessions/active");
        const data = await res.json();
        if (cancelled) return;
        const sessions: ActiveSession[] = data.success && Array.isArray(data.data) ? data.data : [];
        const session = findPlaySession(sessions, sessionIdParam, pathParam);
        setActiveSession(session);
        setHasAlreadySubmitted(!!session?.has_submitted);
        setSubmitSuccess(false);
        setSubmitError(null);
        setEffectivePathParam(sessionIdParam !== null ? session?.game_path ?? null : pathParam);
        setSessionError(sessionIdParam !== null && (!session || !session.game_path)
          ? "Phiên không tồn tại, đã hết giờ hoặc bạn không có quyền tham gia."
          : null);
        if (!res.ok && sessionIdParam !== null) {
          setSessionError(data.error || "Không thể tải phiên làm bài.");
        }
      } catch (error) {
        console.error("Error fetching active sessions:", error);
        if (!cancelled) {
          setActiveSession(null);
          setEffectivePathParam(pathParam);
          setSessionError("Không thể tải phiên làm bài. Vui lòng tải lại trang.");
        }
      } finally {
        if (!cancelled) setLoadedContextKey(contextKey);
      }
    };

    fetchActiveSessions();
    return () => { cancelled = true; };
  }, [user, pathParam, sessionIdParam, contextKey]);

  // Fetch game info from API
  useEffect(() => {
    if (!effectivePathParam) return;
    let cancelled = false;

    const fetchGameInfo = async () => {
      try {
        const res = await fetch(
          `/api/games/info?path=${encodeURIComponent(effectivePathParam)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.data) {
          setGameInfo(data.data);
        } else {
          setGameInfo(null);
          console.error("Failed to fetch game info:", data.error);
        }
      } catch (error) {
        console.error("Error fetching game info:", error);
        if (!cancelled) setGameInfo(null);
      } finally {
        if (!cancelled) setLoadedGamePath(effectivePathParam);
      }
    };

    fetchGameInfo();
    return () => { cancelled = true; };
  }, [effectivePathParam]);

  const handleSubmitCode = useCallback(async () => {
    if (!activeSession || loadedContextKey !== contextKey) return;
    if (submitting || hasAlreadySubmitted) return;

    const gameInstance = (
      window as Window & { gameInstance?: SessionGameInstance }
    ).gameInstance;

    // Coding sets serialize all answers through getCode(). Games continue
    // using the visible editor value as before.
    const codeInput = document.querySelector(
      "#code-input",
    ) as HTMLTextAreaElement;
    const code =
      typeof gameInstance?.getCode === "function"
        ? gameInstance.getCode()
        : codeInput?.value;

    if (typeof code !== "string") {
      setSubmitError("Không tìm thấy code editor");
      return;
    }

    if (!code.trim()) {
      setSubmitError("Vui lòng nhập code trước khi nộp bài");
      return;
    }

    if (!gameInstance || !gameInstance.getTestResults) {
      setSubmitError(
        "Vui lòng chạy code và kiểm tra test cases trước khi nộp bài!",
      );
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn nộp bài tới giáo viên chưa? Sau khi nộp, bài làm sẽ được gửi để giáo viên xem kết quả.",
    );
    if (!confirmed) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      try {
        await gameInstance.prepareSubmission?.();
      } catch (error) {
        console.error("Session grading error:", error);
        setSubmitError(
          "Không thể chấm toàn bộ test case. Vui lòng kiểm tra code và thử lại.",
        );
        return;
      }

      if (gameInstance.canSubmit && !gameInstance.canSubmit()) {
        setSubmitError(
          gameInstance.getIncompleteMessage?.() ||
            "Không thể chấm đầy đủ bài làm để nộp.",
        );
        return;
      }

      const testResults = gameInstance.getTestResults();
      const passedTests = Number(
        testResults.passedTests ?? testResults.passed ?? 0,
      );
      const totalTests = Number(
        testResults.totalTests ?? testResults.total ?? 0,
      );

      if (totalTests === 0) {
        setSubmitError("Game chưa cung cấp test case để chấm bài.");
        return;
      }

      const score =
        typeof gameInstance.getScore === "function"
          ? Number(gameInstance.getScore())
          : Number.isFinite(Number(testResults.score))
            ? Number(testResults.score)
            : Math.round((passedTests / totalTests) * 100);

      const res = await fetch(
        `/api/student/sessions/${activeSession.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            passed_tests: passedTests,
            total_tests: totalTests,
            score,
          }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        setHasAlreadySubmitted(true);
      } else {
        if (res.status === 409) setHasAlreadySubmitted(true);
        setSubmitError(data.error || "Có lỗi xảy ra khi nộp bài");
      }
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError("Không thể kết nối với server");
    } finally {
      setSubmitting(false);
    }
  }, [activeSession, loadedContextKey, contextKey, submitting, hasAlreadySubmitted]);

  useEffect(() => {
    if (!isSessionMode) return;

    const handleSessionSubmitRequest = () => {
      void handleSubmitCode();
    };

    window.addEventListener(SESSION_SUBMIT_EVENT, handleSessionSubmitRequest);
    return () => {
      window.removeEventListener(
        SESSION_SUBMIT_EVENT,
        handleSessionSubmitRequest,
      );
    };
  }, [isSessionMode, handleSubmitCode]);

  useEffect(() => {
    if (!isSessionMode) return;

    window.dispatchEvent(
      new CustomEvent(SESSION_SUBMIT_STATE_EVENT, {
        detail: {
          submitting,
          submitted: hasAlreadySubmitted,
        },
      }),
    );
  }, [isSessionMode, submitting, hasAlreadySubmitted]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (isSessionMode && loadedContextKey !== contextKey) {
    return <main className="flex-1 p-8 text-center">Đang tải phiên làm bài...</main>;
  }

  if (isSessionMode && sessionError) {
    return (
      <main className="flex-1 p-8 text-center">
        <p className="text-red-700 mb-4">{sessionError}</p>
        <Link href="/student/sessions" className="text-blue-600 underline">Quay lại danh sách phiên</Link>
      </main>
    );
  }

  if (effectivePathParam && loadedGamePath !== effectivePathParam) {
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
            {!isSessionMode && (
              <Link
                href="/game"
                className="text-blue-600 hover:underline text-sm sm:text-base"
              >
                Quay lại danh sách
              </Link>
            )}
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
              {isSessionMode && (
                <Link
                  href="/student/sessions"
                  className="px-3 sm:px-4 py-2 border-2 border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm sm:text-base whitespace-nowrap"
                >
                  ← Danh sách session
                </Link>
              )}
              {!isSessionMode && (
                <Link
                  href={backLink}
                  className="px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Quay lại</span>
                  <span className="sm:hidden">←</span>
                </Link>
              )}
            </div>
          </div>

          {submitError && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {submitError}
            </div>
          )}

          {hasAlreadySubmitted && submitSuccess && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs sm:text-sm">
              ✓ Nộp bài thành công! Giáo viên sẽ xem và chấm điểm. Bạn đã hoàn thành session này.
            </div>
          )}

          <PlayGameContent
            key={effectivePathParam}
            pathParam={effectivePathParam}
            sessionMode={isSessionMode}
            sessionSubmitted={hasAlreadySubmitted}
            sessionSubmitting={submitting}
          />
          <SessionSubmitPortal
            active={!!activeSession && loadedContextKey === contextKey}
            submitting={submitting}
            submitted={hasAlreadySubmitted}
            pathKey={effectivePathParam}
            onSubmit={handleSubmitCode}
          />
        </div>
      </section>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayContent />
    </Suspense>
  );
}
