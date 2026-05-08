"use client";

import { useEffect, useRef, useState } from "react";

// Declare global loadPyodide from CDN
declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface PlayGameContentProps {
  pathParam: string;
}

export default function PlayGameContent({ pathParam }: PlayGameContentProps) {
  const gameRootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Đang tải Pyodide...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadGame = async () => {
      if (!gameRootRef.current) return;

      try {
        // Load Pyodide script from CDN
        setStatus("Đang tải Pyodide...");

        // Load Pyodide script if not already loaded
        if (!window.loadPyodide) {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("Failed to load Pyodide script"));
            document.head.appendChild(script);
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
        });

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
            initGame(gameRootRef.current, { pyodide });
            setStatus("Game đã sẵn sàng!");
          }
        } catch (importError: any) {
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
    };
  }, [pathParam]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 sm:p-6 rounded-lg">
        <p className="text-red-700 mb-2 text-sm sm:text-base">{error}</p>
        <p className="text-xs sm:text-sm text-gray-600">
          Các game cần được chuyển đổi sang Next.js. Vui lòng kiểm tra lại.
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
