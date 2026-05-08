"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User, Class, Assignment, Ranking } from "@/types";

export default function StudentDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "assignments" | "classes" | "rankings"
  >("assignments");

  // Join class modal
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);
    loadData();
  }, [router]);

  const loadData = async () => {
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
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");

    try {
      const response = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: classCode }),
      });

      const data = await response.json();

      if (data.success) {
        setShowJoinClassModal(false);
        setClassCode("");
        loadData();
      } else {
        setJoinError(data.error || "Không thể tham gia lớp");
      }
    } catch {
      setJoinError("Lỗi kết nối server");
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (endTime: Date | string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return "Đã hết hạn";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
    return `Còn ${minutes} phút`;
  };

  const isAssignmentActive = (assignment: Assignment) => {
    const now = new Date();
    const start = new Date(assignment.startTime);
    const end = new Date(assignment.endTime);
    return now >= start && (now <= end || assignment.lateSubmission);
  };

  if (!currentUser) return null;

  const activeAssignments = assignments.filter((a) => isAssignmentActive(a));
  const pastAssignments = assignments.filter((a) => !isAssignmentActive(a));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bảng điều khiển
            </h1>
            <p className="text-sm text-gray-500">
              Xin chào, {currentUser.fullName || currentUser.username}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/student/submit")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📝 Nộp bài nhanh
            </button>
            <button
              onClick={() => setShowJoinClassModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Tham gia lớp
            </button>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {classes.length}
            </div>
            <div className="text-gray-500">Lớp học</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">
              {activeAssignments.length}
            </div>
            <div className="text-gray-500">Bài tập cần làm</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {pastAssignments.length}
            </div>
            <div className="text-gray-500">Đã hoàn thành</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {assignments.length}
            </div>
            <div className="text-gray-500">Tổng bài tập</div>
          </div>
        </div>

        {/* Active Assignments Alert */}
        {activeAssignments.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-orange-800 font-medium mb-2">
              ⚠️ Bạn có {activeAssignments.length} bài tập cần hoàn thành
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAssignments.slice(0, 4).map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    router.push(`/student/assignment/${assignment.id}`)
                  }
                >
                  <div className="font-medium">{assignment.title}</div>
                  <div className="text-sm text-gray-500">
                    {assignment.className}
                  </div>
                  <div className="text-sm text-orange-600 mt-1">
                    {getTimeRemaining(assignment.endTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex -mb-px">
              {[
                { key: "assignments", label: "Bài tập" },
                { key: "classes", label: "Lớp học" },
                { key: "rankings", label: "Xếp hạng" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
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
            {/* Assignments Tab */}
            {activeTab === "assignments" && (
              <>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Đang tải...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có bài tập nào. Hãy tham gia một lớp học!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active */}
                    {activeAssignments.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-3">
                          Đang mở
                        </h3>
                        <div className="space-y-3">
                          {activeAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="border-l-4 border-orange-500 bg-orange-50 rounded-r-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() =>
                                router.push(
                                  `/student/assignment/${assignment.id}`,
                                )
                              }
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold">
                                    {assignment.title}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {assignment.className}
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">
                                    Hạn: {formatDate(assignment.endTime)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-orange-600 font-medium">
                                    {getTimeRemaining(assignment.endTime)}
                                  </span>
                                  <button className="block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                    Làm bài →
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {pastAssignments.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-700 mb-3">
                          Đã kết thúc
                        </h3>
                        <div className="space-y-2">
                          {pastAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() =>
                                router.push(
                                  `/student/assignment/${assignment.id}`,
                                )
                              }
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">
                                    {assignment.title}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {assignment.className}
                                  </p>
                                </div>
                                <span className="text-gray-400 text-sm">
                                  {formatDate(assignment.endTime)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Classes Tab */}
            {activeTab === "classes" && (
              <>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Bạn chưa tham gia lớp nào
                    <button
                      onClick={() => setShowJoinClassModal(true)}
                      className="block mx-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Tham gia lớp ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-semibold text-lg">{cls.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {cls.description || "Không có mô tả"}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                          <span>👨‍🏫 {cls.teacherName}</span>
                          <span>📚 {cls.studentCount} HS</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-400">
                          {cls.schoolYear} • Khối {cls.grade}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Rankings Tab */}
            {activeTab === "rankings" && (
              <div className="text-center py-8 text-gray-500">
                Chọn một bài tập để xem bảng xếp hạng
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {assignments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/student/assignment/${a.id}`)}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      {a.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Join Class Modal */}
      {showJoinClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tham gia lớp học</h2>

            <form onSubmit={handleJoinClass}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã lớp
                  </label>
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-xl font-mono tracking-widest"
                    placeholder="ABCD1234"
                    maxLength={10}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Nhập mã lớp do giáo viên cung cấp
                  </p>
                </div>

                {joinError && (
                  <div className="text-red-600 text-sm text-center">
                    {joinError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinClassModal(false);
                    setClassCode("");
                    setJoinError("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tham gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
