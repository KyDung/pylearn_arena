"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

interface SystemStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalContests: number;
  activeContests: number;
  totalSubmissions: number;
  recentActivities: Activity[];
}

interface Activity {
  id: number;
  type: "class_created" | "contest_created" | "submission" | "user_joined";
  description: string;
  user: string;
  timestamp: string;
}

interface TeacherStats {
  id: number;
  username: string;
  fullName: string;
  classCount: number;
  studentCount: number;
  contestCount: number;
  submissionCount: number;
}

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  color: string;
  bgGradient: string;
  iconBg: string;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "teachers" | "activity"
  >("overview");

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

  const loadData = async () => {
    setLoading(true);
    try {
      // Load system stats
      const [usersRes, classesRes, contestsRes] = await Promise.all([
        fetch("/api/admin/users?pageSize=1000"),
        fetch("/api/classes"),
        fetch("/api/contests"),
      ]);

      const usersData = await usersRes.json();
      const classesData = await classesRes.json();
      const contestsData = await contestsRes.json();

      const users = usersData.success ? usersData.data.items || [] : [];
      const classes = classesData.success ? classesData.data.items || [] : [];
      const contests = contestsData.success ? contestsData.data || [] : [];

      // Calculate stats
      const totalSubmissions = contests.reduce(
        (sum: number, c: any) => sum + (c.submission_count || 0),
        0,
      );

      setStats({
        totalUsers: users.length,
        totalTeachers: users.filter((u: any) => u.role === "teacher").length,
        totalStudents: users.filter((u: any) => u.role === "student").length,
        totalClasses: classes.length,
        totalContests: contests.length,
        activeContests: contests.filter((c: any) => c.status === "active")
          .length,
        totalSubmissions,
        recentActivities: [], // Would need a separate API for this
      });

      // Calculate per-teacher stats
      const teachers = users.filter((u: any) => u.role === "teacher");
      const teacherStatsData: TeacherStats[] = teachers.map((teacher: any) => {
        const teacherClasses = classes.filter(
          (c: any) => c.teacherId === teacher.id,
        );
        const teacherContests = contests.filter(
          (c: any) => c.created_by === teacher.id,
        );
        const studentCount = teacherClasses.reduce(
          (sum: number, c: any) => sum + (c.studentCount || 0),
          0,
        );
        const submissionCount = teacherContests.reduce(
          (sum: number, c: any) => sum + (c.submission_count || 0),
          0,
        );

        return {
          id: teacher.id,
          username: teacher.username,
          fullName: teacher.fullName || teacher.username,
          classCount: teacherClasses.length,
          studentCount,
          contestCount: teacherContests.length,
          submissionCount,
        };
      });

      setTeacherStats(teacherStatsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  };

  if (!currentUser) return null;

  // Modern Stat Card Component
  const StatCard = ({
    icon,
    value,
    label,
    color,
    bgGradient,
    iconBg,
  }: StatCardProps) => (
    <div
      className={`group bg-gradient-to-br ${bgGradient} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform cursor-pointer overflow-hidden relative`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="text-5xl filter drop-shadow-lg">{icon}</div>
          <div
            className={`${iconBg} rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
          {value}
        </div>
        <div className={`${color} text-sm font-medium`}>{label}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Modern Gradient Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="text-5xl">📊</span>
                Tổng quan hệ thống
              </h1>
              <p className="text-blue-100 text-lg">
                Xem toàn bộ hoạt động và thống kê của PyLearn Arena
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-blue-50 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
              >
                ← Quay lại Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 font-medium">
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
              <StatCard
                icon="👥"
                value={stats?.totalUsers || 0}
                label="Tổng người dùng"
                color="text-blue-100"
                bgGradient="from-blue-500 to-blue-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="👨‍🏫"
                value={stats?.totalTeachers || 0}
                label="Giáo viên"
                color="text-green-100"
                bgGradient="from-emerald-500 to-green-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="🎓"
                value={stats?.totalStudents || 0}
                label="Học sinh"
                color="text-purple-100"
                bgGradient="from-violet-500 to-purple-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="🏫"
                value={stats?.totalClasses || 0}
                label="Lớp học"
                color="text-indigo-100"
                bgGradient="from-indigo-500 to-indigo-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="🏆"
                value={stats?.totalContests || 0}
                label="Cuộc thi"
                color="text-yellow-100"
                bgGradient="from-yellow-500 to-amber-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="⚡"
                value={stats?.activeContests || 0}
                label="Đang mở"
                color="text-emerald-100"
                bgGradient="from-emerald-500 to-teal-600"
                iconBg="bg-white/20"
              />
              <StatCard
                icon="📝"
                value={stats?.totalSubmissions || 0}
                label="Bài nộp"
                color="text-orange-100"
                bgGradient="from-orange-500 to-red-600"
                iconBg="bg-white/20"
              />
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Modern Tabs */}
              <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <nav className="flex -mb-px">
                  {[
                    { key: "overview", label: "📈 Tổng quan", icon: "📈" },
                    { key: "teachers", label: "👨‍🏫 Giáo viên", icon: "👨‍🏫" },
                    { key: "activity", label: "📋 Hoạt động", icon: "📋" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
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
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="text-3xl">📊</span>
                        Phân bổ theo giáo viên
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Classes by Teacher */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                          <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                            <span className="text-2xl">🏫</span>
                            Số lớp mỗi giáo viên
                          </h3>
                          <div className="space-y-4">
                            {teacherStats
                              .sort((a, b) => b.classCount - a.classCount)
                              .slice(0, 5)
                              .map((t, idx) => (
                                <div
                                  key={t.id}
                                  className="flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-xl p-4 hover:bg-white/80 transition-all duration-300 group"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg text-blue-600 w-8 bg-blue-100 rounded-lg h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      {idx + 1}
                                    </span>
                                    <span className="text-sm font-medium text-gray-800">
                                      {t.fullName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 rounded-full h-3 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-lg"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            (t.classCount /
                                              Math.max(
                                                ...teacherStats.map(
                                                  (s) => s.classCount,
                                                ),
                                                1,
                                              )) *
                                              100,
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-10 text-right text-blue-600 group-hover:scale-110 transition-transform">
                                      {t.classCount}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {teacherStats.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <p className="text-lg">Chưa có dữ liệu</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Students by Teacher */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                          <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                            <span className="text-2xl">🎓</span>
                            Số học sinh mỗi giáo viên
                          </h3>
                          <div className="space-y-4">
                            {teacherStats
                              .sort((a, b) => b.studentCount - a.studentCount)
                              .slice(0, 5)
                              .map((t, idx) => (
                                <div
                                  key={t.id}
                                  className="flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-xl p-4 hover:bg-white/80 transition-all duration-300 group"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg text-green-600 w-8 bg-green-100 rounded-lg h-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      {idx + 1}
                                    </span>
                                    <span className="text-sm font-medium text-gray-800">
                                      {t.fullName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 rounded-full h-3 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500 shadow-lg"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            (t.studentCount /
                                              Math.max(
                                                ...teacherStats.map(
                                                  (s) => s.studentCount,
                                                ),
                                                1,
                                              )) *
                                              100,
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-10 text-right text-green-600 group-hover:scale-110 transition-transform">
                                      {t.studentCount}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {teacherStats.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                <p className="text-lg">Chưa có dữ liệu</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 shadow-lg">
                      <h3 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2">
                        <span className="text-2xl">⚡</span>
                        Thao tác nhanh
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                          onClick={() => router.push("/admin")}
                          className="group px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl group-hover:scale-110 transition-transform">
                              👥
                            </span>
                            <div>
                              <div className="font-bold">Quản lý</div>
                              <div className="text-sm text-blue-100">
                                Người dùng
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => router.push("/teacher")}
                          className="group px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl group-hover:scale-110 transition-transform">
                              🏫
                            </span>
                            <div>
                              <div className="font-bold">Quản lý</div>
                              <div className="text-sm text-indigo-100">
                                Lớp học
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => router.push("/contests")}
                          className="group px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl group-hover:scale-110 transition-transform">
                              🏆
                            </span>
                            <div>
                              <div className="font-bold">Quản lý</div>
                              <div className="text-sm text-yellow-100">
                                Cuộc thi
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => router.push("/admin/courses")}
                          className="group px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl group-hover:scale-110 transition-transform">
                              📚
                            </span>
                            <div>
                              <div className="font-bold">Quản lý</div>
                              <div className="text-sm text-purple-100">
                                Khóa học
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teachers Tab */}
                {activeTab === "teachers" && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <span className="text-3xl">👨‍🏫</span>
                      Thống kê theo giáo viên
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Giáo viên
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Lớp học
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Học sinh
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Cuộc thi
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Bài nộp
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                              Hành động
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherStats.map((teacher, idx) => (
                            <tr
                              key={teacher.id}
                              className={`border-t hover:bg-blue-50 transition-colors duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {teacher.fullName[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900">
                                      {teacher.fullName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      @{teacher.username}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 shadow-sm hover:shadow-md transition-all">
                                  {teacher.classCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 shadow-sm hover:shadow-md transition-all">
                                  {teacher.studentCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 shadow-sm hover:shadow-md transition-all">
                                  {teacher.contestCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800 shadow-sm hover:shadow-md transition-all">
                                  {teacher.submissionCount}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/teacher?teacherId=${teacher.id}`,
                                    )
                                  }
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 transform text-sm"
                                >
                                  Xem chi tiết →
                                </button>
                              </td>
                            </tr>
                          ))}
                          {teacherStats.length === 0 && (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-6 py-16 text-center"
                              >
                                <div className="flex flex-col items-center gap-4">
                                  <div className="text-7xl opacity-50">👨‍🏫</div>
                                  <p className="text-gray-500 font-medium text-lg">
                                    Chưa có giáo viên nào trong hệ thống
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Thêm giáo viên từ trang quản lý người dùng
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === "activity" && (
                  <div className="text-center py-16">
                    <div className="flex flex-col items-center gap-6">
                      <div className="text-8xl opacity-50">📋</div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        Hoạt động gần đây
                      </h3>
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200 max-w-2xl">
                        <p className="text-lg text-gray-700 font-medium mb-3">
                          🚧 Tính năng đang được phát triển
                        </p>
                        <p className="text-gray-600">
                          Sẽ hiển thị các hoạt động gần đây như:
                        </p>
                        <ul className="mt-4 space-y-2 text-left text-gray-600">
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600">•</span>
                            Tạo lớp học mới
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-600">•</span>
                            Tạo cuộc thi mới
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-purple-600">•</span>
                            Học sinh nộp bài
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-orange-600">•</span>
                            Người dùng mới đăng ký
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
