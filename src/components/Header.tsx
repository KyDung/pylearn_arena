"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "@/lib/auth";
import type { User } from "@/types";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setShowMenu(false);
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === "admin") return "/admin";
    if (user.role === "teacher") return "/teacher";
    return "/student";
  };

  const getRoleLabel = () => {
    if (!user) return "";
    if (user.role === "admin") return "Admin";
    if (user.role === "teacher") return "Giáo viên";
    return "Học sinh";
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-16 py-4 sm:py-6 bg-[#f6f2ec]/85 backdrop-blur-md border-b border-gray-200/50">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-xl sm:text-2xl tracking-tight"
      >
        <span className="bg-[#ff7a50] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
          Py
        </span>
        <span className="hidden sm:inline">Learn Arena</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/"
          className={`hover:text-[#ff7a50] transition-colors ${pathname === "/" ? "font-semibold text-[#ff7a50]" : ""}`}
        >
          Trang chủ
        </Link>
        <Link
          href="/game"
          className={`hover:text-[#ff7a50] transition-colors ${
            pathname?.startsWith("/game") ||
            pathname?.startsWith("/course") ||
            pathname?.startsWith("/lesson") ||
            pathname?.startsWith("/play")
              ? "font-semibold text-[#ff7a50]"
              : ""
          }`}
        >
          Học qua game
        </Link>
        {user && (
          <Link
            href={getDashboardLink() || "/"}
            className={`hover:text-[#ff7a50] transition-colors ${
              pathname?.startsWith("/admin") ||
              pathname?.startsWith("/teacher") ||
              pathname?.startsWith("/student")
                ? "font-semibold text-[#ff7a50]"
                : ""
            }`}
          >
            {user.role === "student" ? "Lớp học" : "Quản lý"}
          </Link>
        )}
      </nav>

      {/* Desktop User Menu */}
      <div className="hidden md:flex items-center gap-3 ml-auto">
        {!user ? (
          <>
            <Link
              href="/login"
              className="text-sm hover:text-gray-600 transition-colors"
            >
              Đăng nhập
            </Link>
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 bg-[#ff7a50] text-white rounded-lg text-sm font-medium hover:bg-[#ff6940] transition-all hover:shadow-lg"
            >
              Bắt đầu miễn phí
            </button>
          </>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#ff7a50] text-white flex items-center justify-center font-bold text-sm">
                {(user.fullName || user.username)[0].toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">
                  {user.fullName || user.username}
                </div>
                <div className="text-xs text-gray-500">{getRoleLabel()}</div>
              </div>
              <svg
                className="w-4 h-4 transition-transform"
                style={{
                  transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border z-20 py-2">
                  <Link
                    href={getDashboardLink() || "/"}
                    className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    📊 Bảng điều khiển
                  </Link>
                  {(user.role === "teacher" || user.role === "admin") && (
                    <>
                      <Link
                        href="/teacher/classes"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        👥 Quản lý lớp học
                      </Link>
                      <Link
                        href="/teacher/sessions"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        📝 Quản lý sessions
                      </Link>
                    </>
                  )}
                  {user.role === "student" && (
                    <>
                      <Link
                        href="/student/sessions"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        📝 Sessions
                      </Link>
                      <Link
                        href="/student/join-class"
                        className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMenu(false)}
                      >
                        🎓 Tham gia lớp
                      </Link>
                    </>
                  )}
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    👤 Hồ sơ
                  </Link>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Hamburger */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="md:hidden ml-auto p-2 rounded-lg hover:bg-white/50 transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {showMobileMenu ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed top-[72px] right-0 left-0 bg-white shadow-lg z-40 md:hidden border-t border-gray-200 max-h-[calc(100vh-72px)] overflow-y-auto">
            <nav className="flex flex-col p-4">
              <Link
                href="/"
                className={`px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors ${pathname === "/" ? "font-semibold bg-[#ff7a50]/10 text-[#ff7a50]" : ""}`}
                onClick={() => setShowMobileMenu(false)}
              >
                🏠 Trang chủ
              </Link>
              <Link
                href="/game"
                className={`px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors ${
                  pathname?.startsWith("/game") ||
                  pathname?.startsWith("/course") ||
                  pathname?.startsWith("/lesson") ||
                  pathname?.startsWith("/play")
                    ? "font-semibold bg-[#ff7a50]/10 text-[#ff7a50]"
                    : ""
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                🎮 Học qua game
              </Link>
              {user && (
                <Link
                  href={getDashboardLink() || "/"}
                  className={`px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname?.startsWith("/admin") ||
                    pathname?.startsWith("/teacher") ||
                    pathname?.startsWith("/student")
                      ? "font-semibold bg-[#ff7a50]/10 text-[#ff7a50]"
                      : ""
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {user.role === "student" ? "🎓 Lớp học" : "⚙️ Quản lý"}
                </Link>
              )}

              {user ? (
                <>
                  <hr className="my-3" />
                  <div className="px-4 py-2 text-sm text-gray-500">
                    Xin chào,{" "}
                    <span className="font-semibold text-gray-700">
                      {user.fullName || user.username}
                    </span>
                  </div>
                  {(user.role === "teacher" || user.role === "admin") && (
                    <>
                      <Link
                        href="/teacher/classes"
                        className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        👥 Quản lý lớp học
                      </Link>
                      <Link
                        href="/teacher/sessions"
                        className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        📝 Quản lý sessions
                      </Link>
                    </>
                  )}
                  {user.role === "student" && (
                    <>
                      <Link
                        href="/student/sessions"
                        className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        📝 Sessions
                      </Link>
                      <Link
                        href="/student/join-class"
                        className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        🎓 Tham gia lớp
                      </Link>
                    </>
                  )}
                  <Link
                    href="/profile"
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    👤 Hồ sơ
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="text-left px-4 py-3 rounded-lg text-red-600 hover:bg-gray-100 transition-colors"
                  >
                    🚪 Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <hr className="my-3" />
                  <Link
                    href="/login"
                    className="px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    🔑 Đăng nhập
                  </Link>
                  <button
                    onClick={() => {
                      router.push("/login");
                      setShowMobileMenu(false);
                    }}
                    className="mx-4 mt-2 px-4 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-all hover:shadow-lg"
                  >
                    Bắt đầu miễn phí
                  </button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
