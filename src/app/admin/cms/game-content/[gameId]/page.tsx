"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

interface TestCase {
  input: string;
  expected: string;
  description: string;
  sceneText: string;
}

interface GameConfig {
  gameId: string;
  title: string;
  description: string;
  pythonFunction: string;
  starterCode: string;
  testCases: TestCase[];
  gameType: "type1" | "type2";
}

export default function GameContentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [config, setConfig] = useState<GameConfig | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pythonFunction, setPythonFunction] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }
    loadConfig();
  }, [gameId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/game-content/${gameId}/config`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(err.message || "Failed to load");
      }
      const data = await res.json();
      const cfg: GameConfig = data.data;
      setConfig(cfg);
      setTitle(cfg.title || "");
      setDescription(cfg.description || "");
      setPythonFunction(cfg.pythonFunction || "");
      setStarterCode(cfg.starterCode || "");
      setTestCases(cfg.testCases || []);
    } catch (err: any) {
      alert("Lỗi tải game: " + err.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/game-content/${gameId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, pythonFunction, starterCode, testCases }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Lỗi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      { input: "", expected: "", description: `Test case ${prev.length + 1}`, sceneText: `Level ${prev.length + 1}` },
    ]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  const removeTestCase = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Đang tải cấu hình game...</p>
        </div>
      </div>
    );
  }

  const decodedId = decodeURIComponent(gameId);
  const isType1 = config?.gameType === "type1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all text-white font-medium border border-white/30"
              >
                ← Quay lại
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  🎮 Chỉnh sửa Game
                </h1>
                <p className="text-purple-200 text-sm mt-0.5 font-mono">{decodedId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold animate-pulse">
                  ✅ Đã lưu thành công!
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-white text-purple-700 rounded-xl hover:bg-purple-50 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-60"
              >
                {saving ? "⏳ Đang lưu..." : "💾 Lưu tất cả"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* File path info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-blue-600 text-lg">📁</span>
          <code className="text-sm text-blue-800 font-mono">src/content/{decodedId}/index.ts</code>
          <span className="ml-auto text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
            {isType1 ? "Type 1 — Function Testing" : "Type 2 — Input/Output"}
          </span>
        </div>

        {/* Section 1: Basic Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="text-2xl">📝</span> Thông tin cơ bản
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tiêu đề Game</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="Nhập tiêu đề game..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Đề bài <span className="text-gray-400 font-normal">(hỗ trợ HTML)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm transition-all"
                placeholder={`Mô tả bài tập, yêu cầu...\n\nVí dụ với table:\n<table><tr><th>Input</th><th>Output</th></tr><tr><td>5</td><td>25</td></tr></table>`}
              />
            </div>
            {/* Preview */}
            {description && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Preview</p>
                <h4 className="font-bold text-gray-900 mb-2">{title || "(Chưa có tiêu đề)"}</h4>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Python Config */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="text-2xl">🐍</span> Cấu hình Python
          </h2>
          <div className="space-y-5">
            {isType1 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên hàm học sinh phải viết
                  <span className="text-gray-400 font-normal ml-2">(pythonFunction)</span>
                </label>
                <input
                  type="text"
                  value={pythonFunction}
                  onChange={(e) => setPythonFunction(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono transition-all"
                  placeholder="vd: my_function, reverse_string, tinh_tong..."
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Học sinh phải định nghĩa hàm với đúng tên này. Hệ thống sẽ gọi hàm để kiểm tra kết quả.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Starter Code
                <span className="text-gray-400 font-normal ml-2">(code mẫu hiển thị cho học sinh)</span>
              </label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-sm bg-[#1e1e2e] text-[#cdd6f4] placeholder-[#6c7086] transition-all"
                style={{ lineHeight: "1.6", tabSize: 4, resize: "vertical" }}
                placeholder={isType1
                  ? "def my_function(param):\n    # Viết code ở đây\n    return result"
                  : "a = int(input())\nb = int(input())\nprint(a + b)"}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Test Cases */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🧪</span> Test Cases
              <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {testCases.length} test
              </span>
            </h2>
            <a
              href="/dev/content-manager"
              target="_blank"
              className="text-sm px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all font-medium"
            >
              ⚡ Tạo từ Python →
            </a>
          </div>

          {testCases.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500 mb-3">Chưa có test case nào</p>
              <button
                onClick={addTestCase}
                className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-medium"
              >
                + Thêm test case đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Input</div>
                <div className="col-span-3">Expected Output</div>
                <div className="col-span-2">Scene Text</div>
                <div className="col-span-2">Mô tả</div>
                <div className="col-span-1"></div>
              </div>

              {testCases.map((tc, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-all items-center"
                >
                  <div className="col-span-1 text-center">
                    <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={tc.input}
                      onChange={(e) => updateTestCase(index, "input", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-400 text-sm font-mono bg-white transition-all"
                      placeholder='vd: "hello"'
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={tc.expected}
                      onChange={(e) => updateTestCase(index, "expected", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-400 text-sm font-mono bg-white transition-all"
                      placeholder='vd: "olleh"'
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={tc.sceneText}
                      onChange={(e) => updateTestCase(index, "sceneText", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-400 text-sm bg-white transition-all"
                      placeholder="Level 1"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={tc.description}
                      onChange={(e) => updateTestCase(index, "description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-400 text-sm bg-white transition-all"
                      placeholder="Mô tả..."
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeTestCase(index)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Xóa test case"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addTestCase}
                className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-all font-medium text-sm"
              >
                + Thêm test case
              </button>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <strong>Lưu ý:</strong> Mỗi test case = 1 scene trong game. Input/Expected phải khớp với định dạng mà game type yêu cầu.
            {isType1
              ? ' Type 1: Input là tham số gọi hàm (vd: "hello" hoặc [1, 2]).'
              : " Type 2: Input là chuỗi nhập qua input() (dùng \\n để nhiều dòng)."}
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex gap-4 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl hover:from-purple-700 hover:to-violet-700 transition-all font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.01] transform disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "⏳ Đang lưu..." : "💾 Lưu tất cả thay đổi"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-8 py-4 bg-white text-gray-700 rounded-2xl hover:bg-gray-50 transition-all font-semibold border-2 border-gray-200 hover:border-gray-300"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
