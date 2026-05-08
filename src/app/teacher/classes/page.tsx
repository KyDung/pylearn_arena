"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";

interface Class {
  id: number;
  name: string;
  description: string | null;
  code: string;
  teacherId: number;
  teacherName: string;
  schoolYear: string | null;
  grade: string | null;
  maxStudents: number | null;
  studentCount: number;
  status: "active" | "archived";
  createdAt: string;
}

interface ClassMember {
  id: number;
  userId: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "student";
  status: "active" | "removed";
  joinedAt: string;
}

export default function TeacherClassesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    role: string;
  } | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ClassMember | null>(
    null,
  );
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Create/Edit class form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schoolYear: new Date().getFullYear().toString(),
    grade: "",
    maxStudents: 40,
  });
  const [submitting, setSubmitting] = useState(false);

  // Add/Edit student form
  const [studentForm, setStudentForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
  });

  // Bulk import
  const [bulkContent, setBulkContent] = useState("");
  const [bulkFormat, setBulkFormat] = useState<"csv" | "txt">("csv");

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
  }, [router]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      console.log("Classes API response:", data);
      // API returns { data: { items: [...] } }
      setClasses(data.data?.items || data.items || []);
    } catch (err: any) {
      console.error("Error fetching classes:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (classId: number) => {
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/classes/${classId}/members`, {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Members API response:", res.status, data);

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch members");
      }
      // API returns { success: true, data: [...] }
      setMembers(data.data || data);
    } catch (err: any) {
      console.error("Error fetching members:", err);
      alert("Không thể tải danh sách học sinh: " + err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên lớp");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create class");
      }

      // Reset and refresh
      setFormData({
        name: "",
        description: "",
        schoolYear: new Date().getFullYear().toString(),
        grade: "",
        maxStudents: 40,
      });
      setShowCreateModal(false);
      fetchClasses();
    } catch (err: any) {
      console.error("Error creating class:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMembers = async (cls: Class) => {
    setSelectedClass(cls);
    setShowMembersModal(true);
    await fetchMembers(cls.id);
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedClass) return;
    if (!confirm("Bạn có chắc muốn xóa học sinh này khỏi lớp?")) return;

    try {
      const res = await fetch(
        `/api/classes/${selectedClass.id}/members?userId=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to remove member");

      // Refresh members list
      await fetchMembers(selectedClass.id);
      // Refresh classes to update count
      await fetchClasses();
    } catch (err: any) {
      console.error("Error removing member:", err);
      alert("Không thể xóa học sinh");
    }
  };

  const handleEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || "",
      schoolYear: cls.schoolYear || new Date().getFullYear().toString(),
      grade: cls.grade || "",
      maxStudents: cls.maxStudents || 40,
    });
    setShowEditClassModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên lớp");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update class");
      }

      setShowEditClassModal(false);
      setSelectedClass(null);
      await fetchClasses();
      alert("Cập nhật lớp thành công!");
    } catch (err: any) {
      console.error("Error updating class:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreClass = async (cls: Class) => {
    if (!confirm(`Bạn có chắc muốn khôi phục lớp "${cls.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (!res.ok) throw new Error("Failed to restore class");

      await fetchClasses();
      alert("Đã khôi phục lớp học");
    } catch (err: any) {
      console.error("Error restoring class:", err);
      alert("Không thể khôi phục lớp");
    }
  };

  const handleDeleteClass = async (cls: Class, permanent: boolean = false) => {
    if (permanent) {
      // Hard delete - only for archived classes
      const input = prompt(
        `⚠️ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN lớp "${cls.name}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC và sẽ xóa:\n- Lớp học\n- Tất cả thành viên\n- Các bài tập đã giao\n- Sessions đã tạo\n\nNhập "XOA" để xác nhận:`,
      );
      if (input !== "XOA") return;
    } else {
      // Soft delete - archive
      if (
        !confirm(
          `Bạn có chắc muốn lưu trữ lớp "${cls.name}"? Lớp sẽ được chuyển sang trạng thái "Archived".`,
        )
      ) {
        return;
      }
    }

    try {
      const url = permanent
        ? `/api/classes/${cls.id}?permanent=true`
        : `/api/classes/${cls.id}`;

      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete class");
      }

      await fetchClasses();
      alert(permanent ? "Đã xóa vĩnh viễn lớp học" : "Đã lưu trữ lớp học");
    } catch (err: any) {
      console.error("Error deleting class:", err);
      alert(err.message || "Không thể xóa lớp");
    }
  };

  const handleEditStudent = (student: ClassMember) => {
    setSelectedStudent(student);
    setStudentForm({
      username: student.username,
      password: "", // Don't show current password
      fullName: student.fullName || "",
      email: student.email || "",
    });
    setShowMembersModal(false);
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        fullName: studentForm.fullName,
        email: studentForm.email,
      };

      // Only update password if provided
      if (studentForm.password) {
        updateData.newPassword = studentForm.password;
      }

      const res = await fetch(`/api/admin/users/${selectedStudent.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update student");
      }

      setShowEditStudentModal(false);
      setSelectedStudent(null);
      setStudentForm({ username: "", password: "", fullName: "", email: "" });

      if (selectedClass) {
        await fetchMembers(selectedClass.id);
      }

      alert("Cập nhật thông tin học sinh thành công!");
    } catch (err: any) {
      console.error("Error updating student:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (student: ClassMember) => {
    const newPassword = prompt(
      `Nhập mật khẩu mới cho ${student.fullName || student.username}:`,
    );
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${student.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) throw new Error("Failed to reset password");

      alert(
        `Đã đổi mật khẩu thành công!\nUsername: ${student.username}\nPassword mới: ${newPassword}\n\nGhi chú lại để cung cấp cho học sinh.`,
      );
    } catch (err: any) {
      console.error("Error resetting password:", err);
      alert("Không thể đổi mật khẩu");
    }
  };

  const handleDeleteStudent = async (student: ClassMember) => {
    if (
      !confirm(
        `Bạn có chắc muốn XÓA VĨNH VIỄN tài khoản "${student.fullName || student.username}"? Hành động này không thể hoàn tác!`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${student.userId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete student");

      if (selectedClass) {
        await fetchMembers(selectedClass.id);
      }
      await fetchClasses();
      alert("Đã xóa tài khoản học sinh");
    } catch (err: any) {
      console.error("Error deleting student:", err);
      alert("Không thể xóa tài khoản");
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.username || !studentForm.password) {
      alert("Username và password là bắt buộc");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Create student account
      const createRes = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: studentForm.username,
          password: studentForm.password,
          fullName: studentForm.fullName,
          email: studentForm.email,
          role: "student",
        }),
      });

      if (!createRes.ok) {
        const error = await createRes.json();
        throw new Error(error.error || "Failed to create student");
      }

      const newUser = await createRes.json();

      // Step 2: Add to class if modal opened from class
      if (selectedClass) {
        await fetch(`/api/classes/${selectedClass.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: newUser.id }),
        });
        await fetchMembers(selectedClass.id);
      }

      // Reset form
      setStudentForm({ username: "", password: "", fullName: "", email: "" });
      setShowAddStudentModal(false);
      await fetchClasses();
      alert("Tạo tài khoản học sinh thành công!");
    } catch (err: any) {
      console.error("Error creating student:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkContent.trim()) {
      alert("Vui lòng nhập nội dung");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Bulk create users
      const createRes = await fetch("/api/admin/users/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: bulkContent,
          format: bulkFormat,
        }),
      });

      if (!createRes.ok) {
        const error = await createRes.json();
        throw new Error(error.error || "Failed to import");
      }

      const result = await createRes.json();

      // Step 2: Add all to class if modal opened from class
      if (selectedClass && result.users) {
        const userIds = result.users.map((u: any) => u.id);
        await fetch(`/api/classes/${selectedClass.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });
        await fetchMembers(selectedClass.id);
      }

      setBulkContent("");
      setShowBulkImportModal(false);
      await fetchClasses();
      alert(`Đã import ${result.created} tài khoản!`);
    } catch (err: any) {
      console.error("Error bulk import:", err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const activeClasses = classes.filter((c) => c.status === "active");
  const archivedClasses = classes.filter((c) => c.status === "archived");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="px-8 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Quản lý Lớp học
                </h1>
                <p className="text-gray-600">
                  Tạo lớp, quản lý học sinh, và theo dõi tiến độ học tập
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setShowAddStudentModal(true);
                  }}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                  title="Tạo tài khoản học sinh mới trong hệ thống (có thể thêm vào bất kỳ lớp nào sau)"
                >
                  👤 Tạo tài khoản mới
                </button>
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                >
                  📥 Import hàng loạt
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105"
                >
                  ➕ Tạo lớp mới
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Cách quản lý học sinh
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Tạo tài khoản mới:</strong> Tạo tài khoản học
                      sinh trong hệ thống (GLOBAL). Tài khoản này có thể được
                      thêm vào nhiều lớp khác nhau.
                    </li>
                    <li>
                      • <strong>Thêm vào lớp:</strong> Khi tạo từ bên trong lớp
                      (hoặc chọn lớp), học sinh sẽ tự động được thêm vào lớp đó.
                    </li>
                    <li>
                      • <strong>Import hàng loạt:</strong> Tạo nhiều tài khoản
                      cùng lúc và thêm vào lớp được chọn.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">Tổng số lớp</div>
                <div className="text-3xl font-bold text-indigo-600">
                  {classes.length}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">
                  Lớp đang hoạt động
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {activeClasses.length}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <div className="text-gray-600 text-sm mb-1">Tổng học sinh</div>
                <div className="text-3xl font-bold text-purple-600">
                  {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Active Classes */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🟢 Lớp đang hoạt động ({activeClasses.length})
              </h2>
              {activeClasses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-gray-600 text-lg">Chưa có lớp nào</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Tạo lớp đầu tiên
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100"
                    >
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                        <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
                        {cls.description && (
                          <p className="text-indigo-100 text-sm line-clamp-2">
                            {cls.description}
                          </p>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Mã lớp:</span>
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded">
                              {cls.code}
                            </span>
                          </div>

                          {cls.schoolYear && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Năm học:</span>
                              <span className="font-medium text-gray-900">
                                {cls.schoolYear}
                              </span>
                            </div>
                          )}

                          {cls.grade && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Khối:</span>
                              <span className="font-medium text-gray-900">
                                {cls.grade}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Học sinh:</span>
                            <span className="font-medium text-gray-900">
                              {cls.studentCount}
                              {cls.maxStudents && ` / ${cls.maxStudents}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tạo ngày:</span>
                            <span className="font-medium text-gray-900">
                              {formatDate(cls.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenMembers(cls)}
                              className="flex-1 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition font-medium text-sm"
                            >
                              👥 Học sinh
                            </button>
                            <Link
                              href={`/teacher/sessions?class_id=${cls.id}`}
                              className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-medium text-sm text-center"
                            >
                              📝 Sessions
                            </Link>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClass(cls)}
                              className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-medium"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls, false)}
                              className="flex-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition text-xs font-medium"
                            >
                              📦 Lưu trữ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Classes */}
            {archivedClasses.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  📦 Lớp đã lưu trữ ({archivedClasses.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {archivedClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-gray-50 rounded-xl shadow-md overflow-hidden border border-gray-200 opacity-75"
                    >
                      <div className="bg-gray-400 p-6 text-white">
                        <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
                        {cls.description && (
                          <p className="text-gray-100 text-sm line-clamp-2">
                            {cls.description}
                          </p>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="text-sm text-gray-600 mb-4">
                          <div>
                            Mã: <span className="font-mono">{cls.code}</span>
                          </div>
                          <div>Học sinh: {cls.studentCount}</div>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleRestoreClass(cls)}
                            className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                          >
                            ♻️ Khôi phục
                          </button>
                          {currentUser?.role === "admin" && (
                            <button
                              onClick={() => handleDeleteClass(cls, true)}
                              className="w-full px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-xs font-medium"
                            >
                              🗑️ Xóa vĩnh viễn
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
              <h2 className="text-2xl font-bold text-white">➕ Tạo lớp mới</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Hệ thống sẽ tự động tạo mã lớp cho bạn
              </p>
            </div>

            <form onSubmit={handleCreateClass} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="VD: Lớp Python 10A1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả về lớp học..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Năm học
                    </label>
                    <input
                      type="text"
                      value={formData.schoolYear}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolYear: e.target.value })
                      }
                      placeholder="2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khối
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) =>
                        setFormData({ ...formData, grade: e.target.value })
                      }
                      placeholder="10, 11, 12..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số học sinh tối đa
                  </label>
                  <input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxStudents: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={200}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedClass.name}
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    Mã lớp:{" "}
                    <span className="font-mono font-bold">
                      {selectedClass.code}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingMembers ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-600 text-lg mb-2">
                    Chưa có học sinh nào
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Thêm học sinh bằng các cách sau:
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        // Keep selectedClass so new student gets added to this class
                        setShowMembersModal(false);
                        setShowAddStudentModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      title="Tạo tài khoản mới và tự động thêm vào lớp này"
                    >
                      ➕ Tạo & thêm vào lớp
                    </button>
                    <button
                      onClick={() => {
                        setShowMembersModal(false);
                        setShowBulkImportModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      📥 Import hàng loạt
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-6">
                    Hoặc chia sẻ mã lớp{" "}
                    <span className="font-mono font-bold text-indigo-600">
                      {selectedClass.code}
                    </span>{" "}
                    cho học sinh tự tham gia
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Tổng:{" "}
                      <span className="font-semibold">{members.length}</span>{" "}
                      học sinh
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Keep selectedClass so new student gets added to this class
                          setShowMembersModal(false);
                          setShowAddStudentModal(true);
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                        title="Tạo tài khoản mới và tự động thêm vào lớp này"
                      >
                        ➕ Tạo & thêm
                      </button>
                      <button
                        onClick={() => {
                          setShowMembersModal(false);
                          setShowBulkImportModal(true);
                        }}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium"
                      >
                        📥 Import
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-lg">
                              {member.fullName || member.username}
                            </div>
                            <div className="text-sm text-gray-600">
                              @{member.username}
                              {member.email && ` • ${member.email}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Tham gia: {formatDate(member.joinedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStudent(member)}
                            className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                          >
                            ✏️ Sửa thông tin
                          </button>
                          <button
                            onClick={() => handleResetPassword(member)}
                            className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-medium"
                          >
                            🔑 Đổi mật khẩu
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition text-sm font-medium"
                          >
                            🚪 Xóa khỏi lớp
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(member)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                          >
                            🗑️ Xóa TK
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowMembersModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">
                ➕ Tạo tài khoản học sinh mới
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {selectedClass
                  ? `Tài khoản sẽ được tạo và tự động thêm vào lớp "${selectedClass.name}"`
                  : "Tài khoản sẽ được tạo trong hệ thống (có thể thêm vào lớp sau)"}
              </p>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentForm.username}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        username: e.target.value,
                      })
                    }
                    placeholder="VD: nguyenvana"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Mật khẩu"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ghi chú lại để cung cấp cho học sinh
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    value={studentForm.fullName}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        fullName: e.target.value,
                      })
                    }
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, email: e.target.value })
                    }
                    placeholder="student@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    if (selectedClass) setShowMembersModal(true);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-2xl font-bold text-white">
                📥 Import học sinh hàng loạt
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {selectedClass
                  ? `Tự động thêm vào lớp ${selectedClass.name}`
                  : "Tạo nhiều tài khoản cùng lúc"}
              </p>
            </div>

            <form onSubmit={handleBulkImport} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Định dạng file
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="csv"
                      checked={bulkFormat === "csv"}
                      onChange={(e) => setBulkFormat(e.target.value as "csv")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">CSV (dấu phẩy)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="txt"
                      checked={bulkFormat === "txt"}
                      onChange={(e) => setBulkFormat(e.target.value as "txt")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">TXT (cách nhau bởi space)</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung
                </label>
                <textarea
                  value={bulkContent}
                  onChange={(e) => setBulkContent(e.target.value)}
                  placeholder={
                    bulkFormat === "csv"
                      ? "username,password,fullName,email\nnguyenvana,123456,Nguyễn Văn A,a@email.com\ntranthib,123456,Trần Thị B,b@email.com"
                      : 'nguyenvana 123456 "Nguyễn Văn A" a@email.com\ntranthib 123456 "Trần Thị B" b@email.com'
                  }
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                  📌 Hướng dẫn:
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  {bulkFormat === "csv" ? (
                    <>
                      <li>
                        • Mỗi dòng:{" "}
                        <code className="bg-white px-1 rounded">
                          username,password,fullName,email
                        </code>
                      </li>
                      <li>• Dòng đầu có thể là header (sẽ tự động bỏ qua)</li>
                      <li>• Email có thể để trống</li>
                      <li>
                        • VD:{" "}
                        <code className="bg-white px-1 rounded">
                          student1,pass123,Học sinh 1,student1@email.com
                        </code>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        • Mỗi dòng:{" "}
                        <code className="bg-white px-1 rounded">
                          username password fullName email
                        </code>
                      </li>
                      <li>• Các trường cách nhau bởi khoảng trắng</li>
                      <li>• Họ tên có dấu cách thì để trong dấu ngoặc kép</li>
                      <li>
                        • VD:{" "}
                        <code className="bg-white px-1 rounded">
                          student1 pass123 "Học sinh 1" student1@email.com
                        </code>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImportModal(false);
                    if (selectedClass) setShowMembersModal(true);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Đang import..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">
                ✏️ Sửa thông tin lớp
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Cập nhật thông tin cho lớp {selectedClass.name}
              </p>
            </div>

            <form onSubmit={handleUpdateClass} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên lớp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="VD: Lớp Python 10A1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả về lớp học..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Năm học
                    </label>
                    <input
                      type="text"
                      value={formData.schoolYear}
                      onChange={(e) =>
                        setFormData({ ...formData, schoolYear: e.target.value })
                      }
                      placeholder="2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Khối
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) =>
                        setFormData({ ...formData, grade: e.target.value })
                      }
                      placeholder="10, 11, 12..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số học sinh tối đa
                  </label>
                  <input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxStudents: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={200}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditClassModal(false);
                    setSelectedClass(null);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
              <h2 className="text-2xl font-bold text-white">
                ✏️ Sửa thông tin học sinh
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Cập nhật thông tin cho @{selectedStudent.username}
              </p>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={studentForm.username}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Username không thể thay đổi
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu mới (để trống nếu không đổi)
                  </label>
                  <input
                    type="text"
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Nhập mật khẩu mới hoặc để trống"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Để trống nếu không muốn thay đổi mật khẩu
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    value={studentForm.fullName}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        fullName: e.target.value,
                      })
                    }
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, email: e.target.value })
                    }
                    placeholder="student@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStudentModal(false);
                    setSelectedStudent(null);
                    if (selectedClass) setShowMembersModal(true);
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition font-medium disabled:opacity-50"
                >
                  {submitting ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
