"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinClassPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError("Vui lòng nhập mã lớp");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không thể tham gia lớp");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile"); // Redirect to profile or classes page
      }, 2000);
    } catch (err: any) {
      console.error("Join class error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-8 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h1 className="text-3xl font-bold mb-2">Tham gia lớp học</h1>
              <p className="text-blue-100">
                Nhập mã lớp mà giáo viên đã cung cấp
              </p>
            </div>

            {/* Form */}
            <div className="p-8">
              {success ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✓</div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">
                    Tham gia thành công!
                  </h2>
                  <p className="text-gray-600">Đang chuyển hướng...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã lớp
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      placeholder="VD: ABC123"
                      maxLength={10}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono font-bold uppercase"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Mã lớp thường gồm 6 ký tự (chữ và số)
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <div>
                          <div className="font-semibold mb-1">Lỗi</div>
                          <div>{error}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Đang xử lý...
                      </span>
                    ) : (
                      "🚀 Tham gia lớp"
                    )}
                  </button>

                  <div className="text-center">
                    <Link
                      href="/profile"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Quay lại trang chủ
                    </Link>
                  </div>
                </form>
              )}

              {/* Info Section */}
              {!success && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📌 Hướng dẫn:
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">1.</span>
                      <span>Nhận mã lớp từ giáo viên của bạn</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">2.</span>
                      <span>Nhập mã vào ô bên trên</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">3.</span>
                      <span>Nhấn "Tham gia lớp" để hoàn tất</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Additional Help */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Gặp vấn đề? Liên hệ giáo viên để được hỗ trợ
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
