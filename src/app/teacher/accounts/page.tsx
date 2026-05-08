"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

interface User {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "student" | "teacher" | "admin";
  status: "active" | "inactive" | "banned";
  createdAt: string;
  classIds?: number[];
  classNames?: string[];
}

interface Class {
  id: number;
  name: string;
  code: string;
  studentCount: number;
}

export default function AccountsManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    role: string;
  } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showAddToClassModal, setShowAddToClassModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Forms
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "student" as "student" | "teacher",
    classId: "",
  });
  const [bulkContent, setBulkContent] = useState("");
  const [bulkClassId, setBulkClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "teacher" && user.role !== "admin") {
      router.push("/");
      return;
    }
    setCurrentUser(user);
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load classes
      const classRes = await fetch("/api/classes", { credentials: "include" });
      const classData = await classRes.json();
      if (classData.success) {
        setClasses(classData.data?.items || []);
      }

      // Load users
      await loadUsers();
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole !== "all") params.append("role", filterRole);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);
      params.append("pageSize", "100");

      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        let userList = data.data?.items || [];

        // If teacher, only show students
        if (currentUser?.role === "teacher") {
          userList = userList.filter((u: User) => u.role === "student");
        }

        // Filter by class if selected
        if (filterClass !== "all") {
          const classId = parseInt(filterClass);
          // Need to load members for this class
          const membersRes = await fetch(`/api/classes/${classId}/members`, {
            credentials: "include",
          });
          const membersData = await membersRes.json();
          const memberIds = (membersData.data || []).map(
            (m: { userId: number }) => m.userId,
          );
          userList = userList.filter((u: User) => memberIds.includes(u.id));
        }

        setUsers(userList);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
  }, [filterRole, filterClass, filterStatus, searchQuery, currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password) {
      alert("Username và password là bắt buộc");
      return;
    }

    setSubmitting(true);
    try {
      // Create user
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: userForm.username,
          password: userForm.password,
          fullName: userForm.fullName,
          email: userForm.email,
          role: currentUser?.role === "admin" ? userForm.role : "student",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo tài khoản");

      // Add to class if selected
      if (userForm.classId && data.data?.id) {
        await fetch(`/api/classes/${userForm.classId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: data.data.id }),
        });
      }

      setShowCreateModal(false);
      setUserForm({
        username: "",
        password: "",
        fullName: "",
        email: "",
        role: "student",
        classId: "",
      });
      await loadUsers();
      alert("Tạo tài khoản thành công!");
    } catch (error: any) {
      alert(error.message);
    }
    setSubmitting(false);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: userForm.fullName,
          email: userForm.email,
          newPassword: userForm.password || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi cập nhật");
      }

      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
      alert("Cập nhật thành công!");
    } catch (error: any) {
      alert(error.message);
    }
    setSubmitting(false);
  };

  const handleDeleteUser = async (user: User, permanent: boolean = false) => {
    const deleteType = permanent ? "XÓA VĨNH VIỄN" : "VÔ HIỆU HÓA";
    const confirmMessage = permanent
      ? `⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN tài khoản "${user.fullName || user.username}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC và sẽ xóa:\n- Tài khoản\n- Tất cả bài nộp\n- Tiến độ học tập\n- Các dữ liệu liên quan\n\nNhập "XOA" để xác nhận:`
      : `Bạn có chắc muốn vô hiệu hóa tài khoản "${user.fullName || user.username}"?\n\n(Tài khoản sẽ bị khóa nhưng dữ liệu vẫn được lưu)`;

    let confirmed = false;
    if (permanent) {
      const input = prompt(confirmMessage);
      confirmed = input === "XOA";
    } else {
      confirmed = confirm(confirmMessage);
    }

    if (!confirmed) return;

    try {
      const url = permanent
        ? `/api/admin/users/${user.id}?permanent=true`
        : `/api/admin/users/${user.id}`;

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi xóa tài khoản");
      }

      await loadUsers();
      alert(
        permanent ? "Đã xóa vĩnh viễn tài khoản" : "Đã vô hiệu hóa tài khoản",
      );
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(
      `Nhập mật khẩu mới cho ${user.fullName || user.username}:`,
    );
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) throw new Error("Lỗi đổi mật khẩu");

      alert(
        `Đã đổi mật khẩu!\nUsername: ${user.username}\nPassword mới: ${newPassword}`,
      );
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkContent.trim()) {
      alert("Vui lòng nhập danh sách tài khoản");
      return;
    }

    setSubmitting(true);
    try {
      const lines = bulkContent
        .trim()
        .split("\n")
        .filter((l) => l.trim());
      const accounts: {
        username: string;
        password: string;
        fullName: string;
      }[] = [];

      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 2) {
          accounts.push({
            username: parts[0],
            password: parts[1],
            fullName: parts[2] || parts[0],
          });
        }
      }

      if (accounts.length === 0) {
        throw new Error("Không có tài khoản hợp lệ");
      }

      let created = 0;
      let failed = 0;

      for (const account of accounts) {
        try {
          const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              username: account.username,
              password: account.password,
              fullName: account.fullName,
              role: "student",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            // Add to class if selected
            if (bulkClassId && data.data?.id) {
              await fetch(`/api/classes/${bulkClassId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: data.data.id }),
              });
            }
            created++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      setShowBulkImportModal(false);
      setBulkContent("");
      setBulkClassId("");
      await loadUsers();
      alert(
        `Đã tạo ${created} tài khoản${failed > 0 ? `, ${failed} lỗi` : ""}`,
      );
    } catch (error: any) {
      alert(error.message);
    }
    setSubmitting(false);
  };

  const handleAddToClass = async (classId: number) => {
    if (selectedUsers.length === 0) return;

    try {
      const res = await fetch(`/api/classes/${classId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (!res.ok) throw new Error("Lỗi thêm vào lớp");

      setShowAddToClassModal(false);
      setSelectedUsers([]);
      await loadUsers();
      alert("Đã thêm vào lớp thành công!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemoveFromClass = async (userId: number, classId: number) => {
    if (!confirm("Bạn có chắc muốn xóa học sinh này khỏi lớp?")) return;

    try {
      const res = await fetch(
        `/api/classes/${classId}/members?userId=${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error("Lỗi xóa khỏi lớp");

      await loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      password: "",
      fullName: user.fullName || "",
      email: user.email || "",
      role: user.role as "student" | "teacher",
      classId: "",
    });
    setShowEditModal(true);
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const filteredUsers = users;

  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý Tài khoản
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin
                ? "Quản lý tất cả tài khoản trong hệ thống"
                : "Quản lý tài khoản học sinh"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(isAdmin ? "/admin" : "/teacher")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-blue-600">
              {users.length}
            </div>
            <div className="text-gray-500 text-sm">Tổng tài khoản</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-green-600">
              {users.filter((u) => u.role === "student").length}
            </div>
            <div className="text-gray-500 text-sm">Học sinh</div>
          </div>
          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-3xl font-bold text-purple-600">
                {users.filter((u) => u.role === "teacher").length}
              </div>
              <div className="text-gray-500 text-sm">Giáo viên</div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-3xl font-bold text-orange-600">
              {classes.length}
            </div>
            <div className="text-gray-500 text-sm">Lớp học</div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Tìm kiếm tên, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border rounded-lg w-64"
              />

              {/* Filter by role (admin only) */}
              {isAdmin && (
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="student">Học sinh</option>
                  <option value="teacher">Giáo viên</option>
                </select>
              )}

              {/* Filter by class */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">Tất cả lớp</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id.toString()}>
                    {cls.name} ({cls.studentCount || 0})
                  </option>
                ))}
              </select>

              {/* Filter by status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
                <option value="banned">Bị khóa</option>
              </select>
            </div>

            <div className="flex gap-2">
              {selectedUsers.length > 0 && (
                <button
                  onClick={() => setShowAddToClassModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ➕ Thêm {selectedUsers.length} vào lớp
                </button>
              )}
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                📥 Import hàng loạt
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ➕ Tạo tài khoản
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.length === users.length &&
                        users.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Tài khoản
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Họ tên
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Vai trò
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Lớp
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Không có tài khoản nào
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          @{user.username}
                        </div>
                        {user.email && (
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.fullName || (
                          <span className="text-gray-400 italic">
                            Chưa có tên
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : user.role === "teacher"
                                  ? "bg-purple-100 text-purple-800"
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
                      )}
                      <td className="px-4 py-3">
                        {filterClass !== "all" ? (
                          <button
                            onClick={() =>
                              handleRemoveFromClass(
                                user.id,
                                parseInt(filterClass),
                              )
                            }
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Xóa khỏi lớp này"
                          >
                            🗑️ Xóa khỏi lớp
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800"
                              : user.status === "banned"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.status === "active"
                            ? "Hoạt động"
                            : user.status === "banned"
                              ? "Bị khóa"
                              : "Không hoạt động"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEditModal(user)}
                            className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                            title="Sửa thông tin"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="px-2 py-1 text-yellow-600 hover:bg-yellow-50 rounded text-sm"
                            title="Đổi mật khẩu"
                          >
                            🔑
                          </button>
                          {currentUser?.role === "admin" ? (
                            <>
                              <button
                                onClick={() => handleDeleteUser(user, false)}
                                className="px-2 py-1 text-orange-600 hover:bg-orange-50 rounded text-sm"
                                title="Vô hiệu hóa (soft delete)"
                              >
                                🔒
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user, true)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                title="Xóa vĩnh viễn (hard delete)"
                              >
                                🗑️
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(user, false)}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                              title="Xóa tài khoản"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">
                Tạo tài khoản mới
              </h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="VD: nguyenvana"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Mật khẩu ít nhất 6 ký tự"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="email@example.com"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Vai trò
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value as "student" | "teacher",
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="student">Học sinh</option>
                    <option value="teacher">Giáo viên</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Thêm vào lớp (tùy chọn)
                </label>
                <select
                  value={userForm.classId}
                  onChange={(e) =>
                    setUserForm({ ...userForm, classId: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Không thêm vào lớp</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              {isAdmin && userForm.role === "teacher" && userForm.classId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Lưu ý:</strong> "Thêm vào lớp" sẽ thêm giáo viên
                    làm <strong>thành viên</strong> của lớp, không phải quản lý
                    lớp. Giáo viên nên tự tạo lớp của mình ở trang "Quản lý lớp
                    học".
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-green-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Sửa tài khoản</h2>
              <p className="text-green-100 text-sm">@{selectedUser.username}</p>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu mới (để trống nếu không đổi)
                </label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Import hàng loạt</h2>
              <p className="text-indigo-100 text-sm">
                Tạo nhiều tài khoản cùng lúc
              </p>
            </div>
            <form onSubmit={handleBulkImport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Thêm vào lớp (tùy chọn)
                </label>
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Không thêm vào lớp</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Danh sách tài khoản <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Mỗi dòng: username,password,họ tên (họ tên tùy chọn)
                </p>
                <textarea
                  value={bulkContent}
                  onChange={(e) => setBulkContent(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={8}
                  placeholder={`hs01,123456,Nguyễn Văn A
hs02,123456,Trần Văn B
hs03,123456`}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Đang import..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Class Modal */}
      {showAddToClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-green-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Thêm vào lớp</h2>
              <p className="text-green-100 text-sm">
                {selectedUsers.length} tài khoản đã chọn
              </p>
            </div>
            <div className="p-6">
              <p className="mb-4 text-gray-600">Chọn lớp để thêm:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleAddToClass(cls.id)}
                    className="w-full text-left px-4 py-3 border rounded-lg hover:bg-green-50 hover:border-green-500 transition"
                  >
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-sm text-gray-500">
                      Mã: {cls.code} • {cls.studentCount || 0} học sinh
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddToClassModal(false)}
                className="w-full mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
