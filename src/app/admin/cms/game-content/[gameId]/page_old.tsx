"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function GameContentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }
    loadContent();
  }, [gameId]);

  useEffect(() => {
    setHasChanges(
      title !== originalTitle || description !== originalDescription
    );
  }, [title, description, originalTitle, originalDescription]);

  const loadContent = async () => {
    try {
      setLoading(true);
      console.log("[Client] Loading game content for gameId:", gameId);
      const res = await fetch(`/api/admin/game-content/${gameId}`);
      console.log("[Client] Response status:", res.status);

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to load game content");
      }

      const data = await res.json();
      console.log("[Client] Response data:", data);
      
      // API trả về title và description đã được parse
      setTitle(data.data.title || "");
      setDescription(data.data.description || "");
      setOriginalTitle(data.data.title || "");
      setOriginalDescription(data.data.description || "");
    } catch (err: any) {
      console.error("[Client] Error loading content:", err);
      alert("Lỗi: " + err.message);
      router.back();
    } finally {
      setLoading(false);
      const res = await fetch(`/api/admin/game-content/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("Đã lưu thành công! Reload trang để thấy thay đổi.");
      setOriginalContent(content);
      setHasChanges(false);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Bạn có chắc muốn hủy tất cả thay đổi?")) return;
    setContent(originalContent);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Đang tải...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold">Chỉnh sửa nội dung Game</h1>
          {hasChanges && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
              Có thay đổi chưa lưu
            </span>
          )}
        </div>

        <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <strong>Đường dẫn:</strong> <code>src/content/{gameId}/index.ts</code>
        </div>

        {/* Game Config Preview */}
        {gameConfig && (
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <h2 className="font-bold text-lg mb-2">Preview GAME_CONFIG</h2>
            <div className="space-y-2">
              <div>
                <strong>Title:</strong> {gameConfig.title}
              </div>
              <div>
                <strong>Description:</strong>
                <pre className="bg-gray-100 p-2 rounded text-sm mt-1 whitespace-pre-wrap">
                  {gameConfig.description}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Code Editor */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="mb-2 flex justify-between items-center">
            <h2 className="font-bold">Code Editor</h2>
            <div className="text-sm text-gray-600">
              Lines: {content ? content.split("\n").length : 0}
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 font-mono text-sm border rounded p-3"
            spellCheck={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex-1 px-6 py-3 rounded font-semibold ${
              hasChanges && !saving
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={`flex-1 px-6 py-3 rounded font-semibold ${
              hasChanges
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            ↺ Hủy thay đổi
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-bold mb-2">⚠️ Lưu ý khi chỉnh sửa:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>File gốc sẽ được backup tự động trước khi lưu</li>
            <li>
              Chỉnh sửa <code>GAME_CONFIG.title</code> và{" "}
              <code>GAME_CONFIG.description</code> để thay đổi tiêu đề và đề bài
            </li>
            <li>
              Cẩn thận với syntax TypeScript - lỗi syntax sẽ làm game không chạy
              được
            </li>
            <li>Sau khi lưu, cần reload trang game để thấy thay đổi</li>
            <li>Test game sau khi chỉnh sửa để đảm bảo hoạt động đúng</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
