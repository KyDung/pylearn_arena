"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUser, login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(
    "Tài khoản demo: admin/123456 hoặc testuser/123456",
  );
  const [statusType, setStatusType] = useState<"info" | "error" | "success">(
    "info",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) {
      router.push("/profile");
    }
  }, [router]);

  const getNextPage = () => {
    const next = searchParams.get("next");
    const course = searchParams.get("course");
    const lesson = searchParams.get("lesson");
    const path = searchParams.get("path");

    if (next === "play" && path) {
      return `/play?path=${encodeURIComponent(path)}`;
    }

    if (next === "lesson" && course && lesson) {
      return `/lesson/${encodeURIComponent(course)}/${encodeURIComponent(lesson)}`;
    }

    if (next === "course" && course) {
      return `/course/${encodeURIComponent(course)}`;
    }

    if (next === "profile") {
      return "/profile";
    }

    if (next === "game") {
      return "/game";
    }

    return "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Đang đăng nhập...");
    setStatusType("info");

    const result = await login(username.trim(), password.trim());

    if (result.success && result.user) {
      setStatus(
        `Đăng nhập thành công! Xin chào ${result.user.fullName || result.user.username}`,
      );
      setStatusType("success");
      setTimeout(() => {
        router.push(getNextPage());
      }, 500);
    } else {
      setStatus(result.error || "Đăng nhập thất bại");
      setStatusType("error");
      setLoading(false);
    }
  };

  return (
    <main className="flex-1">
      <section className="px-16 py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">Đăng nhập</h2>
            <p className="text-gray-700">
              Hiện tại là tài khoản mock. Xác thực thật sẽ có sau.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-xl shadow-md space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-2">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="testuser"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a50]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a50]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <p
              className={`text-sm text-center ${
                statusType === "error"
                  ? "text-red-600"
                  : statusType === "success"
                    ? "text-green-600"
                    : "text-gray-600"
              }`}
            >
              {status}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
