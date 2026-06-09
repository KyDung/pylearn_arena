"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User, PaginatedResponse, UserRole, UserStatus } from "@/types";

interface UserStats {
  total: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  recentlyCreated: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "teachers" | "students"
  >("overview");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "student" as UserRole,
  });
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
    loadData();
    loadStats();
  }, [router]);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadData(
        activeTab === "teachers" ? "teacher" : activeTab === "students" ? "student" : undefined,
        searchText,
      );
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchText]);

  const loadData = async (role?: UserRole, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (search) params.set("search", search);
      params.set("pageSize", "50");

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({
          username: "",
          password: "",
          fullName: "",
          email: "",
          role: "student",
        });
        loadData(
          activeTab === "teachers"
            ? "teacher"
            : activeTab === "students"
              ? "student"
              : undefined,
        );
      } else {
        setCreateError(data.error || "Không thể tạo tài khoản");
      }
    } catch {
      setCreateError("Lỗi kết nối server");
    }
  };

  const handleSuspendUser = async (userId: number) => {
    if (!confirm("Bạn có chắc muốn khóa tài khoản này?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend" }),
      });

      const data = await response.json();
      if (data.success) {
        loadData(
          activeTab === "teachers"
            ? "teacher"
            : activeTab === "students"
              ? "student"
              : undefined,
        );
      }
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });

      const data = await response.json();
      if (data.success) {
        loadData(
          activeTab === "teachers"
            ? "teacher"
            : activeTab === "students"
              ? "student"
              : undefined,
        );
      }
    } catch (error) {
      console.error("Failed to activate user:", error);
    }
  };

  if (loading && !users) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-3">
                <span className="text-4xl">🛡️</span>
                Admin Dashboard
              </h1>
              <p className="text-blue-100 mt-2 text-sm lg:text-base">
                Quản lý hệ thống và người dùng
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push("/admin/accounts")}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
              >
                👥 Tài khoản
              </button>
              <button
                onClick={() => router.push("/teacher/classes")}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
              >
                📚 Lớp học
              </button>
              <button
                onClick={() => router.push("/dev/content-manager")}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
              >
                📦 Nội dung
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-blue-50 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
              >
                ← Trang chủ
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Modern Stats Cards with Icons & Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl filter drop-shadow-lg">👥</div>
                <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
                {stats?.total ?? users?.total ?? 0}
              </div>
              <div className="text-blue-100 text-sm font-medium mb-3">
                Tổng người dùng
              </div>
              <div className="flex items-center text-xs text-blue-200">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
                Tất cả tài khoản
              </div>
            </div>
          </div>

          {/* Teachers Card */}
          <div className="group bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl filter drop-shadow-lg">👨‍🏫</div>
                <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
                {stats?.byRole.teacher ?? users?.items.filter((u) => u.role === "teacher").length ?? 0}
              </div>
              <div className="text-green-100 text-sm font-medium mb-3">
                Giáo viên
              </div>
              <div className="flex items-center text-xs text-green-200">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
                Đang giảng dạy
              </div>
            </div>
          </div>

          {/* Students Card */}
          <div className="group bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl filter drop-shadow-lg">🎓</div>
                <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
                {stats?.byRole.student ?? users?.items.filter((u) => u.role === "student").length ?? 0}
              </div>
              <div className="text-purple-100 text-sm font-medium mb-3">
                Học sinh
              </div>
              <div className="flex items-center text-xs text-purple-200">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
                Đang học tập
              </div>
            </div>
          </div>

          {/* Active Users Card */}
          <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform cursor-pointer overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-5xl filter drop-shadow-lg">⚡</div>
                <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
                {stats?.byStatus.active ?? users?.items.filter((u) => u.status === "active").length ?? 0}
              </div>
              <div className="text-orange-100 text-sm font-medium mb-3">
                Tài khoản kích hoạt
              </div>
              <div className="flex items-center text-xs text-orange-200">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Trạng thái active
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards - All Admin Pages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">🗂️</span>
            Quản lý hệ thống
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Overview Page */}
            <button
              onClick={() => router.push("/admin/overview")}
              className="group bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl p-6 text-left shadow-md hover:shadow-xl transition-all duration-300 border border-blue-200 hover:border-indigo-300 hover:scale-105 transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  📊
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition-colors">
                Tổng quan hệ thống
              </h3>
              <p className="text-sm text-gray-600">
                Xem thống kê, báo cáo và phân tích toàn hệ thống
              </p>
            </button>

            {/* CMS - Content Management */}
            <button
              onClick={() => router.push("/admin/cms")}
              className="group bg-gradient-to-br from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 rounded-xl p-6 text-left shadow-md hover:shadow-xl transition-all duration-300 border border-purple-200 hover:border-violet-300 hover:scale-105 transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  🎮
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-violet-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-violet-700 transition-colors">
                Quản lý Game & Nội dung
              </h3>
              <p className="text-sm text-gray-600">
                Chỉnh sửa game, bài tập và tài liệu học tập
              </p>
            </button>

            {/* Bulk Import Users */}
            <button
              onClick={() => router.push("/admin/users/bulk-import")}
              className="group bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-xl p-6 text-left shadow-md hover:shadow-xl transition-all duration-300 border border-orange-200 hover:border-amber-300 hover:scale-105 transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-amber-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-amber-700 transition-colors">
                Import người dùng hàng loạt
              </h3>
              <p className="text-sm text-gray-600">
                Thêm nhiều tài khoản cùng lúc từ file CSV/Excel
              </p>
            </button>

            {/* Teacher Portal */}
            <button
              onClick={() => router.push("/teacher")}
              className="group bg-gradient-to-br from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 rounded-xl p-6 text-left shadow-md hover:shadow-xl transition-all duration-300 border border-pink-200 hover:border-rose-300 hover:scale-105 transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  👨‍🏫
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-rose-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-rose-700 transition-colors">
                Trang giáo viên
              </h3>
              <p className="text-sm text-gray-600">
                Quản lý lớp học, bài tập và tiến độ học sinh
              </p>
            </button>

            {/* Dev Tools */}
            <button
              onClick={() => router.push("/dev/content-manager")}
              className="group bg-gradient-to-br from-cyan-50 to-teal-50 hover:from-cyan-100 hover:to-teal-100 rounded-xl p-6 text-left shadow-md hover:shadow-xl transition-all duration-300 border border-cyan-200 hover:border-teal-300 hover:scale-105 transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  📝
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-teal-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-teal-700 transition-colors">
                Quản lý Nội dung
              </h3>
              <p className="text-sm text-gray-600">
                Tạo và chỉnh sửa Course, Topic, Lesson, Game
              </p>
            </button>
          </div>
        </div>

        {/* Modern Tabs & Table Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <nav className="flex -mb-px">
              {[
                { key: "overview", label: "📊 Tổng quan", icon: "📊" },
                { key: "teachers", label: "👨‍🏫 Giáo viên", icon: "👨‍🏫" },
                { key: "students", label: "🎓 Học sinh", icon: "🎓" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as typeof activeTab);
                    loadData(
                      tab.key === "teachers"
                        ? "teacher"
                        : tab.key === "students"
                          ? "student"
                          : undefined,
                    );
                  }}
                  className={`group relative px-8 py-5 text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab.key
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{tab.icon}</span>
                    {tab.label.split(" ")[1]}
                  </span>
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full"></div>
                  )}
                  {activeTab !== tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 group-hover:bg-gray-300 transition-colors"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Actions Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {activeTab === "teachers" && <>👨‍🏫 Danh sách giáo viên</>}
                  {activeTab === "students" && <>🎓 Danh sách học sinh</>}
                  {activeTab === "overview" && <>📋 Tất cả người dùng</>}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Quản lý {users?.total || 0} người dùng
                </p>
              </div>
              <div className="flex gap-3 items-center">
                {/* Search Input */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all w-56 text-sm"
                  />
                </div>
              <button
                onClick={() => {
                  setCreateForm((prev) => ({
                    ...prev,
                    role: activeTab === "teachers" ? "teacher" : "student",
                  }));
                  setShowCreateModal(true);
                }}
                className="group px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Thêm {activeTab === "teachers" ? "giáo viên" : "người dùng"}
              </button>
              </div>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Họ tên
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Vai trò
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users?.items.map((user, index) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                              {user.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {user.fullName || (
                            <span className="text-gray-400 italic">
                              Chưa cập nhật
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.email || (
                            <span className="text-gray-400 italic">
                              Chưa có
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                              user.role === "admin"
                                ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                                : user.role === "teacher"
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                            }`}
                          >
                            {user.role === "admin" && "🛡️ Admin"}
                            {user.role === "teacher" && "👨‍🏫 Giáo viên"}
                            {user.role === "student" && "🎓 Học sinh"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              user.status === "active"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : user.status === "suspended"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-2 ${
                                user.status === "active"
                                  ? "bg-green-500 animate-pulse"
                                  : user.status === "suspended"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                              }`}
                            ></span>
                            {user.status === "active"
                              ? "Hoạt động"
                              : user.status === "suspended"
                                ? "Đã khóa"
                                : "Không hoạt động"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {user.status === "active" ? (
                              <button
                                onClick={() => handleSuspendUser(user.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium border border-red-200"
                              >
                                🔒 Khóa
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(user.id)}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium border border-green-200"
                              >
                                🔓 Mở khóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!loading && users?.items.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Chưa có người dùng
                </h3>
                <p className="text-gray-500">
                  Bấm nút "Thêm người dùng" để tạo tài khoản mới
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg transform transition-all animate-slideUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6 rounded-t-3xl">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">✨</span>
                Tạo tài khoản mới
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Điền thông tin để tạo người dùng mới
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Username *
                  </label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Nhập username..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🔐</span>
                    Mật khẩu *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Nhập mật khẩu..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    Họ tên
                  </label>
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Nhập họ tên..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📧</span>
                    Email
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Nhập email..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🎭</span>
                    Vai trò
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        role: e.target.value as UserRole,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  >
                    <option value="student">🎓 Học sinh</option>
                    <option value="teacher">👨‍🏫 Giáo viên</option>
                    <option value="admin">🛡️ Admin</option>
                  </select>
                </div>

                {createError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-800">
                        Lỗi tạo tài khoản
                      </p>
                      <p className="text-red-600 text-sm mt-1">{createError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform"
                >
                  ✨ Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
