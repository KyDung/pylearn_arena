"use client";

import { useEffect, useRef, useState } from "react";
import { enhanceGameOutputDiffTables } from "@/lib/gameOutputDiff";
import { loadLocalPyodide } from "@/lib/pyodideLoader";

interface PlayGameContentProps {
  pathParam: string;
  sessionMode?: boolean;
  sessionSubmitted?: boolean;
  sessionSubmitting?: boolean;
}

export default function PlayGameContent({
  pathParam,
  sessionMode = false,
  sessionSubmitted = false,
  sessionSubmitting = false,
}: PlayGameContentProps) {
  const gameRootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Đang tải Pyodide...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameRootRef.current) return;
    gameRootRef.current.dataset.sessionMode = String(sessionMode);
    gameRootRef.current.dataset.sessionSubmitted = String(sessionSubmitted);
    gameRootRef.current.dataset.sessionSubmitting = String(sessionSubmitting);
  }, [sessionMode, sessionSubmitted, sessionSubmitting]);

  useEffect(() => {
    let mounted = true;
    let cleanupOutputDiff: (() => void) | null = null;
    let cleanupGame: (() => void) | null = null;

    const loadGame = async () => {
      if (!gameRootRef.current) return;

      try {
        // Load Pyodide from local npm package assets served by this app.
        setStatus("Đang tải Pyodide...");
        const pyodide = await loadLocalPyodide();

        if (!mounted) return;

        const result = pyodide.runPython("1 + 1");
        setStatus(`Pyodide sẵn sàng (${result})`);

        // Dynamic import game module based on path
        setStatus("Đang tải game module...");

        try {
          const gameModule = await import(`@/content/${pathParam}/index`);
          const initGame = gameModule.default;

          if (!initGame) {
            setError(`Game module không có export default: ${pathParam}`);
            return;
          }

          if (!mounted) return;

          if (gameRootRef.current) {
            const cleanup = initGame(gameRootRef.current, {
              pyodide,
              sessionMode,
            });
            if (typeof cleanup === "function") {
              cleanupGame = cleanup;
            }
            cleanupOutputDiff = enhanceGameOutputDiffTables(
              gameRootRef.current,
            );
            setStatus("Game đã sẵn sàng!");
          }
        } catch (importError: unknown) {
          console.error("Failed to import game module:", importError);
          setError(`Không thể tải game: ${pathParam}`);
        }
      } catch (err) {
        console.error("Error loading Pyodide:", err);
        setStatus("Pyodide không tải được");
        setError("Không thể khởi động Python runtime.");
      }
    };

    loadGame();

    return () => {
      mounted = false;
      cleanupOutputDiff?.();
      cleanupGame?.();
    };
  }, [pathParam, sessionMode]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 sm:p-6 rounded-lg">
        <p className="text-red-700 mb-2 text-sm sm:text-base">{error}</p>
        <p className="text-xs sm:text-sm text-gray-600">
          Vui lòng tải lại trang. Nếu lỗi vẫn còn, hãy kiểm tra các file
          Pyodide trong thư mục public/pyodide.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div
        ref={gameRootRef}
        className="min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] p-3 sm:p-4 lg:p-6"
      >
        <p className="text-gray-600 text-sm sm:text-base">{status}</p>
      </div>
    </div>
  );
}
