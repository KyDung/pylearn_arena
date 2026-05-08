"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

interface PreviewUser {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { username: string; error: string }[];
}

export default function BulkImportPage() {
  const router = useRouter();
  const [format, setFormat] = useState<"csv" | "txt">("csv");
  const [textInput, setTextInput] = useState("");
  const [preview, setPreview] = useState<PreviewUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): PreviewUser[] => {
    const lines = text.trim().split("\n");
    const users: PreviewUser[] = [];

    // Skip header if exists
    const startIdx = lines[0]?.toLowerCase().includes("username") ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 2) continue;

      users.push({
        username: parts[0],
        password: parts[1],
        fullName: parts[2] || undefined,
        email: parts[3] || undefined,
        role: parts[4] || "student",
      });
    }

    return users;
  };

  const parseTXT = (text: string): PreviewUser[] => {
    const lines = text.trim().split("\n");
    const users: PreviewUser[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;

      users.push({
        username: parts[0],
        password: parts[1],
        fullName: parts[2] || undefined,
        email: parts[3] || undefined,
        role: parts[4] || "student",
      });
    }

    return users;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setTextInput(text);
  };

  const handlePreview = () => {
    if (!textInput.trim()) {
      alert("Vui lòng nhập dữ liệu hoặc chọn file");
      return;
    }

    const users = format === "csv" ? parseCSV(textInput) : parseTXT(textInput);
    setPreview(users);
    setResult(null);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      alert("Không có dữ liệu để import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/users/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: preview, format }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import thất bại");
      }

      setResult(data);

      // Clear preview if all success
      if (data.failed === 0) {
        setPreview([]);
        setTextInput("");
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const url = `/api/admin/users/template?format=${format}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-amber-50">
      {/* Modern Gradient Header */}
      <header className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="text-5xl">👥</span>
                Import Tài Khoản Hàng Loạt
              </h1>
              <p className="text-orange-100 text-lg">
                Thêm nhiều tài khoản cùng lúc từ file CSV hoặc TXT
              </p>
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="px-6 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              ← Quay lại Admin
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Format Selection Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-6 border border-orange-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">⚙️</span>
            Chọn định dạng file
          </h2>

          <div className="flex flex-wrap gap-4 mb-6">
            <label className="flex-1 min-w-[200px] cursor-pointer">
              <div
                className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                  format === "csv"
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg"
                    : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === "csv"}
                    onChange={(e) => setFormat(e.target.value as "csv")}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-lg text-gray-900">
                      CSV Format
                    </div>
                    <div className="text-sm text-gray-600">
                      Phân cách bằng dấu phẩy
                    </div>
                  </div>
                </div>
              </div>
            </label>

            <label className="flex-1 min-w-[200px] cursor-pointer">
              <div
                className={`p-5 rounded-xl border-2 transition-all duration-300 ${
                  format === "txt"
                    ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg"
                    : "border-gray-200 bg-gray-50 hover:border-green-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="format"
                    value="txt"
                    checked={format === "txt"}
                    onChange={(e) => setFormat(e.target.value as "txt")}
                    className="w-5 h-5 text-green-600"
                  />
                  <div>
                    <div className="font-bold text-lg text-gray-900">
                      TXT Format
                    </div>
                    <div className="text-sm text-gray-600">
                      Phân cách bằng khoảng trắng
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            📥 Tải file mẫu {format.toUpperCase()}
          </button>

          {/* Format Instructions */}
          <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl text-sm border-2 border-blue-200">
            <h3 className="font-bold text-lg mb-3 text-gray-800 flex items-center gap-2">
              <span className="text-xl">📋</span>
              Định dạng {format.toUpperCase()}:
            </h3>
            {format === "csv" ? (
              <>
                <p className="mb-3 font-mono bg-white px-4 py-3 rounded-lg border border-blue-200 text-blue-900">
                  username,password,fullName,email,role
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Ví dụ:</strong>
                </p>
                <code className="block bg-white px-4 py-3 rounded-lg border border-blue-200 text-sm text-blue-900">
                  hocsinh1,Pass123,Nguyễn Văn A,a@email.com,student
                </code>
                <p className="text-gray-600 mt-3">
                  <strong>Lưu ý:</strong> fullName, email, role có thể bỏ trống
                  (mặc định role là student)
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 font-mono bg-white px-4 py-3 rounded-lg border border-green-200 text-green-900">
                  username password [fullName] [email] [role]
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Ví dụ:</strong>
                </p>
                <code className="block bg-white px-4 py-3 rounded-lg border border-green-200 text-sm text-green-900">
                  hocsinh1 Pass123 NguyenVanA a@email.com student
                </code>
                <p className="text-gray-600 mt-3">
                  <strong>Lưu ý:</strong> Sử dụng khoảng trắng để phân cách, []
                  là tùy chọn
                </p>
              </>
            )}
          </div>
        </div>

        {/* Input Section Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-6 border border-purple-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">📝</span>
            Nhập dữ liệu
          </h2>

          <div className="mb-6">
            <label className="block mb-3 font-bold text-gray-700">
              📎 Chọn file:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:text-sm file:font-bold
                file:bg-gradient-to-r file:from-purple-500 file:to-pink-600
                file:text-white
                hover:file:from-purple-600 hover:file:to-pink-700
                file:transition-all file:duration-300
                file:cursor-pointer file:shadow-lg hover:file:shadow-xl
                border-2 border-dashed border-purple-300 rounded-xl p-4 hover:border-purple-500 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block mb-3 font-bold text-gray-700">
              ⌨️ Hoặc dán dữ liệu trực tiếp:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={12}
              className="w-full p-4 border-2 border-purple-300 rounded-xl font-mono text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-gray-50 text-gray-900"
              placeholder={
                format === "csv"
                  ? "username,password,fullName,email,role\nhocsinh1,Pass123,Nguyễn Văn A,a@email.com,student\nhocsinh2,Pass456,Nguyễn Thị B,b@email.com,student"
                  : "username password fullName email role\nhocsinh1 Pass123 NguyenVanA a@email.com student\nhocsinh2 Pass456 NguyenThiB b@email.com student"
              }
            />
          </div>

          <button
            onClick={handlePreview}
            disabled={!textInput.trim()}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 transform text-lg"
          >
            👁️ Xem trước dữ liệu
          </button>
        </div>

        {/* Preview Section Card */}
        {preview.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-6 border border-green-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-3xl">👀</span>
              Xem trước
              <span className="ml-auto text-sm font-normal bg-green-100 text-green-700 px-4 py-2 rounded-full">
                {preview.length} tài khoản
              </span>
            </h2>
            <div className="overflow-x-auto mb-6 rounded-xl border-2 border-green-200">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <tr>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      #
                    </th>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      Password
                    </th>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      Họ tên
                    </th>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="p-4 text-left font-bold text-gray-800 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((user, idx) => (
                    <tr
                      key={idx}
                      className={`border-t hover:bg-green-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="p-4 font-bold text-gray-600">{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-blue-700">
                        {user.username}
                      </td>
                      <td className="p-4 font-mono text-gray-500">
                        {"*".repeat(8)}
                      </td>
                      <td className="p-4 text-gray-700">
                        {user.fullName || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">
                        {user.email || (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            user.role === "admin"
                              ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-md"
                              : user.role === "teacher"
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                : "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 transform text-lg"
            >
              {importing ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Đang import...
                </>
              ) : (
                "✅ Xác nhận import"
              )}
            </button>
          </div>
        )}

        {/* Result Section Card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-indigo-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-3xl">📊</span>
              Kết quả Import
            </h2>
            <div className="mb-6 grid md:grid-cols-2 gap-4">
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">✅</span>
                  <div>
                    <div className="text-3xl font-bold text-green-700">
                      {result.success}
                    </div>
                    <div className="text-green-600 font-medium">
                      Tài khoản thành công
                    </div>
                  </div>
                </div>
              </div>

              {result.failed > 0 && (
                <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-300">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">❌</span>
                    <div>
                      <div className="text-3xl font-bold text-red-700">
                        {result.failed}
                      </div>
                      <div className="text-red-600 font-medium">
                        Tài khoản thất bại
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Chi tiết lỗi:
                </h3>
                <div className="space-y-3">
                  {result.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl text-sm border-2 border-red-200 hover:shadow-md transition-all"
                    >
                      <span className="font-mono font-bold text-red-900 bg-red-100 px-3 py-1 rounded-lg">
                        {err.username}
                      </span>
                      <span className="text-gray-700 ml-3">→ {err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success > 0 && (
              <button
                onClick={() => router.push("/admin")}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
              >
                ← Quay lại Admin Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
