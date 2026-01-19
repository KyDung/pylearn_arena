"use client";

import { useEffect, useRef, useState } from "react";
import initGame1 from "@/content/python-basics/chapter-1/t10-cd-b12/id1/index";
import initGame2 from "@/content/python-basics/chapter-1/t10-cd-b12/id2/index";
import initGame3 from "@/content/python-basics/chapter-1/t10-cd-b12/id3/index";

// Declare global loadPyodide from CDN
declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

interface PlayGameContentProps {
  pathParam: string;
}

// Map game paths to their init functions
const gameModules: Record<
  string,
  (root: HTMLElement, context: { pyodide: any }) => void
> = {
  "python-basics/chapter-1/t10-cd-b12/id1": initGame1,
  "python-basics/chapter-1/t10-cd-b12/id2": initGame2,
  "python-basics/chapter-1/t10-cd-b12/id3": initGame3,
};

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
            "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/pyodide.js";
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("Failed to load Pyodide script"));
            document.head.appendChild(script);
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.1/full/",
        });

        if (!mounted) return;

        const result = pyodide.runPython("1 + 1");
        setStatus(`Pyodide sẵn sàng (${result})`);

        // Load game module
        const initGame = gameModules[pathParam];
        if (!initGame) {
          setError(`Game không tồn tại: ${pathParam}`);
          return;
        }

        if (!mounted) return;

        if (gameRootRef.current) {
          initGame(gameRootRef.current, { pyodide });
          setStatus("Game đã sẵn sàng!");
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
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <p className="text-red-700 mb-2">{error}</p>
        <p className="text-sm text-gray-600">
          Các game cần được chuyển đổi sang Next.js. Vui lòng kiểm tra lại.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div ref={gameRootRef} className="min-h-[600px] p-6">
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
