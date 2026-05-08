"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User, PaginatedResponse, UserRole } from "@/types";

interface UserStats {
  total: number;
  byRole: Record<UserRole, number>;
  recentlyCreated: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
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
    setCurrentUser(user);
    loadData();
  }, [router]);

  const loadData = async (role?: UserRole) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
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
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend" }),
      });
      loadData(
        activeTab === "teachers"
          ? "teacher"
          : activeTab === "students"
            ? "student"
            : undefined,
      );
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      loadData(
        activeTab === "teachers"
          ? "teacher"
          : activeTab === "students"
            ? "student"
            : undefined,
      );
    } catch (error) {
      console.error("Failed to activate user:", error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Quản lý hệ thống PyLearn Arena
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => router.push("/admin/accounts")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              👥 Quản lý tài khoản
            </button>
            <button
              onClick={() => router.push("/teacher/classes")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📚 Quản lý lớp học
            </button>
            <button
              onClick={() => router.push("/teacher/sessions")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              📝 Quản lý Sessions
            </button>
            <button
              onClick={() => router.push("/teacher/course-access")}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              🔐 Phân quyền khóa học
            </button>
            <button
              onClick={() => router.push("/dev/content-manager")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              📦 Quản lý nội dung
            </button>
            <button
              onClick={() => router.push("/admin/cms")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ✏️ Chỉnh sửa nội dung
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg"
            >
              ← Về trang chủ
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {users?.total || 0}
            </div>
            <div className="text-gray-500">Tổng người dùng</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {users?.items.filter((u) => u.role === "teacher").length || 0}
            </div>
            <div className="text-gray-500">Giáo viên</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {users?.items.filter((u) => u.role === "student").length || 0}
            </div>
            <div className="text-gray-500">Học sinh</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">
              {users?.items.filter((u) => u.status === "active").length || 0}
            </div>
            <div className="text-gray-500">Đang hoạt động</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {[
                { key: "overview", label: "Tổng quan" },
                { key: "teachers", label: "Giáo viên" },
                { key: "students", label: "Học sinh" },
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
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Actions */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {activeTab === "teachers"
                  ? "Danh sách giáo viên"
                  : activeTab === "students"
                    ? "Danh sách học sinh"
                    : "Tất cả người dùng"}
              </h2>
              <button
                onClick={() => {
                  setCreateForm((prev) => ({
                    ...prev,
                    role: activeTab === "teachers" ? "teacher" : "student",
                  }));
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Thêm {activeTab === "teachers" ? "giáo viên" : "người dùng"}
              </button>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Đang tải...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Username
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Họ tên
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Vai trò
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users?.items.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {user.username}
                        </td>
                        <td className="px-4 py-3">{user.fullName || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.email || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : user.role === "teacher"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "teacher"
                                ? "Giáo viên"
                                : "Học sinh"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.status === "active"
                                ? "bg-green-100 text-green-800"
                                : user.status === "suspended"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.status === "active"
                              ? "Hoạt động"
                              : user.status === "suspended"
                                ? "Đã khóa"
                                : "Không hoạt động"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.status === "active" ? (
                              <button
                                onClick={() => handleSuspendUser(user.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Khóa
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(user.id)}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Mở khóa
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
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tạo tài khoản mới</h2>

            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {createError && (
                  <div className="text-red-600 text-sm">{createError}</div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
