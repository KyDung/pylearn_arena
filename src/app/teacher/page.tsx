"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User, Class, Assignment, PaginatedResponse } from "@/types";

// Extended Class type with teacher info for admin view
interface ExtendedClass extends Class {
  teacherName?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ExtendedClass[]>([]);
  const [allTeachers, setAllTeachers] = useState<
    { id: number; fullName: string }[]
  >([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

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
    loadData(user);
  }, [router]);

  const loadData = async (user?: User | null) => {
    const currentRole = user?.role || currentUser?.role;
    setLoading(true);
    try {
      // Load classes
      const classRes = await fetch("/api/classes");
      const classData = await classRes.json();
      if (classData.success) {
        setClasses(classData.data.items || []);
      }

      // Load assignments
      const assignmentRes = await fetch("/api/assignments");
      const assignmentData = await assignmentRes.json();
      if (assignmentData.success) {
        setAssignments(assignmentData.data.items || []);
      }

      // Admin: load list of teachers for filter
      if (currentRole === "admin") {
        const teacherRes = await fetch(
          "/api/admin/users?role=teacher&pageSize=100",
        );
        const teacherData = await teacherRes.json();
        if (teacherData.success) {
          setAllTeachers(
            (teacherData.data.items || []).map((t: any) => ({
              id: t.id,
              fullName: t.fullName || t.username,
            })),
          );
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  };

  // Filter classes by selected teacher (for admin)
  const filteredClasses =
    currentUser?.role === "admin" && selectedTeacherId !== "all"
      ? classes.filter((c) => c.teacherId === parseInt(selectedTeacherId))
      : classes;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý lớp học
            </h1>
            <p className="text-sm text-gray-500">
              Xin chào, {currentUser.fullName || currentUser.username}
            </p>
          </div>
          <div className="flex gap-3">
            {/* ẨN CUỘC THI - Chỉ dùng Sessions
            <button
              onClick={() => router.push("/contests")}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              🏆 Cuộc thi
            </button>
            */}
            <button
              onClick={() => router.push("/teacher/sessions")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📊 Nộp bài trực tiếp
            </button>
            {currentUser.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg"
              >
                Admin Dashboard
              </button>
            )}
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Về trang chủ
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => router.push("/teacher/classes")}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-2">👥</div>
            <div className="text-lg font-bold mb-1">Quản lý lớp học</div>
            <div className="text-sm text-indigo-100">
              Tạo lớp, thêm học sinh
            </div>
          </button>

          <button
            onClick={() => router.push("/teacher/accounts")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-2">👤</div>
            <div className="text-lg font-bold mb-1">Quản lý tài khoản</div>
            <div className="text-sm text-green-100">
              Tạo, sửa, xóa tài khoản HS
            </div>
          </button>

          <button
            onClick={() => router.push("/teacher/sessions")}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-2">📝</div>
            <div className="text-lg font-bold mb-1">Sessions trực tiếp</div>
            <div className="text-sm text-blue-100">Mở session, xem bài nộp</div>
          </button>

          <button
            onClick={() => router.push("/teacher/course-access")}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-2">🔐</div>
            <div className="text-lg font-bold mb-1">Phân quyền khóa học</div>
            <div className="text-sm text-orange-100">
              Mở/khóa chương, bài học
            </div>
          </button>

          {/* ẨN CUỘC THI - Chỉ dùng Sessions
          <button
            onClick={() => router.push("/contests")}
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left"
          >
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-lg font-bold mb-1">Cuộc thi</div>
            <div className="text-sm text-yellow-100">
              Tạo và quản lý cuộc thi
            </div>
          </button>
          */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {classes.length}
            </div>
            <div className="text-gray-500">Lớp học</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
            </div>
            <div className="text-gray-500">Học sinh</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {assignments.length}
            </div>
            <div className="text-gray-500">Bài tập</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">
              {assignments.filter((a) => a.status === "published").length}
            </div>
            <div className="text-gray-500">Đang mở</div>
          </div>
        </div>

        {/* My Classes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">📚 Lớp học của tôi</h2>
            <button
              onClick={() => router.push("/teacher/classes")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Xem tất cả →
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">Chưa có lớp học nào</p>
              <button
                onClick={() => router.push("/teacher/classes")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Tạo lớp đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.slice(0, 6).map((cls) => {
                const canManage =
                  currentUser?.role === "admin" ||
                  cls.teacherId === currentUser?.id;

                return (
                  <div
                    key={cls.id}
                    onClick={() => router.push("/teacher/classes")}
                    className="border rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{cls.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          cls.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {cls.status === "active" ? "Hoạt động" : "Lưu trữ"}
                      </span>
                    </div>

                    {currentUser?.role === "admin" && cls.teacherName && (
                      <p className="text-xs text-blue-600 mb-2">
                        👤 {cls.teacherName}
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {cls.description || "Không có mô tả"}
                    </p>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>👥 {cls.studentCount || 0} học sinh</span>
                      {cls.grade && <span>• Khối {cls.grade}</span>}
                    </div>

                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      Mã:{" "}
                      <span className="font-mono font-bold">{cls.code}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {classes.length > 6 && (
            <div className="text-center mt-4">
              <button
                onClick={() => router.push("/teacher/classes")}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Xem thêm {classes.length - 6} lớp →
              </button>
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📌 Hướng dẫn nhanh</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <span className="text-3xl">👥</span>
              <div>
                <div className="font-semibold text-indigo-900">
                  Quản lý lớp học
                </div>
                <div className="text-sm text-indigo-700">
                  Tạo lớp mới, thêm học sinh (từng người hoặc import Excel),
                  quản lý thành viên, sửa/xóa tài khoản, reset mật khẩu
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-3xl">📝</span>
              <div>
                <div className="font-semibold text-blue-900">
                  Sessions trực tiếp
                </div>
                <div className="text-sm text-blue-700">
                  Mở session cho lớp học, học sinh làm bài và nộp trực tiếp, xem
                  kết quả real-time
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="font-semibold text-yellow-900">
                  Cuộc thi lập trình
                </div>
                <div className="text-sm text-yellow-700">
                  Tạo cuộc thi cho học sinh, cấu hình thời gian và quy tắc, theo
                  dõi bảng xếp hạng
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
