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
      title !== originalTitle || description !== originalDescription,
    );
  }, [title, description, originalTitle, originalDescription]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/game-content/${gameId}`);

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to load game content");
      }

      const data = await res.json();
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
    }
  };

  const handleSave = async () => {
    if (!confirm("Bạn có chắc muốn lưu thay đổi? File gốc sẽ được backup.")) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/game-content/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) throw new Error("Failed to save");

      alert("Đã lưu thành công!");
      setOriginalTitle(title);
      setOriginalDescription(description);
      setHasChanges(false);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Bạn có chắc muốn hủy tất cả thay đổi?")) return;
    setTitle(originalTitle);
    setDescription(originalDescription);
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Chỉnh sửa Game</h1>
          {hasChanges && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              ⚠ Có thay đổi chưa lưu
            </span>
          )}
        </div>

        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 rounded p-4">
          <p className="text-sm text-blue-800">
            <strong>📁 Đường dẫn:</strong>{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">
              src/content/{decodeURIComponent(gameId as string)}/index.ts
            </code>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Title Field */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              📝 Tiêu đề Game
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Nhập tiêu đề game..."
            />
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              📋 Đề bài (Hỗ trợ HTML & Table)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm transition"
              placeholder={`Nhập đề bài game...

Hỗ trợ HTML:
- <b>Bold</b>, <i>Italic</i>
- <table>, <tr>, <td>
- <ul>, <li>

Ví dụ table:
<table>
  <tr><th>Input</th><th>Output</th></tr>
  <tr><td>5</td><td>25</td></tr>
</table>`}
            />
          </div>

          {/* Preview */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              👁️ Preview
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                {title || "(Chưa có tiêu đề)"}
              </h4>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    description ||
                    "<p class='text-gray-400 italic'>Chưa có mô tả</p>",
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              hasChanges && !saving
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              hasChanges
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            ↺ Hủy thay đổi
          </button>
        </div>

        {/* Helper Guide */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">💡 Hướng dẫn</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>
              <strong>Tiêu đề:</strong> Tên game hiển thị cho học sinh
            </li>
            <li>
              <strong>Đề bài:</strong> Mô tả bài tập, yêu cầu, ví dụ
              input/output
            </li>
            <li>
              <strong>HTML Table:</strong> Dùng <code>&lt;table&gt;</code> để
              tạo bảng ví dụ
            </li>
            <li>
              <strong>Backup:</strong> File cũ sẽ được backup tự động trước khi
              lưu
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
