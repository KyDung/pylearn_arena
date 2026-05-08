"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { User, Class, ClassMember, Assignment } from "@/types";

interface ClassWithMembers extends Class {
  members: ClassMember[];
}

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classData, setClassData] = useState<ClassWithMembers | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "info" | "members" | "courses" | "assignments"
  >("info");

  // Add student modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

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
    loadClassData();
  }, [router, classId]);

  const loadClassData = async () => {
    setLoading(true);
    try {
      // Load class details
      const classRes = await fetch(`/api/classes/${classId}`);
      const classJson = await classRes.json();
      if (classJson.success) {
        setClassData(classJson.data);
      }

      // Load assignments for this class
      const assignmentRes = await fetch(`/api/assignments?classId=${classId}`);
      const assignmentJson = await assignmentRes.json();
      if (assignmentJson.success) {
        setAssignments(assignmentJson.data.items || []);
      }
    } catch (error) {
      console.error("Failed to load class:", error);
    }
    setLoading(false);
  };

  const loadAvailableStudents = async () => {
    try {
      const response = await fetch(
        "/api/admin/users?role=student&pageSize=100",
      );
      const data = await response.json();
      if (data.success) {
        // Filter out students already in class
        const memberIds = classData?.members.map((m) => m.userId) || [];
        const available = data.data.items.filter(
          (s: User) => !memberIds.includes(s.id),
        );
        setAvailableStudents(available);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) return;

    try {
      await fetch(`/api/classes/${classId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedStudents }),
      });

      setShowAddStudentModal(false);
      setSelectedStudents([]);
      loadClassData();
    } catch (error) {
      console.error("Failed to add students:", error);
    }
  };

  const handleRemoveStudent = async (userId: number) => {
    if (!confirm("Xóa học sinh này khỏi lớp?")) return;

    try {
      await fetch(`/api/classes/${classId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      loadClassData();
    } catch (error) {
      console.error("Failed to remove student:", error);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Không tìm thấy lớp học</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/teacher")}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Quay lại
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {classData.name}
            </h1>
            <p className="text-sm text-gray-500">
              Mã lớp:{" "}
              <span className="font-mono font-bold">{classData.code}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                loadAvailableStudents();
                setShowAddStudentModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Thêm học sinh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {classData.members?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Học sinh</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {assignments.length}
            </div>
            <div className="text-sm text-gray-500">Bài tập</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {classData.schoolYear || "-"}
            </div>
            <div className="text-sm text-gray-500">Năm học</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              Khối {classData.grade || "-"}
            </div>
            <div className="text-sm text-gray-500">Khối lớp</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex -mb-px">
              {[
                { key: "info", label: "Thông tin" },
                {
                  key: "members",
                  label: `Học sinh (${classData.members?.length || 0})`,
                },
                {
                  key: "courses",
                  label: "Khóa học",
                },
                {
                  key: "assignments",
                  label: `Bài tập (${assignments.length})`,
                },
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
            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Mô tả
                  </label>
                  <p className="mt-1">
                    {classData.description || "Không có mô tả"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Số học sinh tối đa
                  </label>
                  <p className="mt-1">{classData.maxStudents}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">
                    Trạng thái
                  </label>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                      classData.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {classData.status === "active" ? "Hoạt động" : "Đã lưu trữ"}
                  </span>
                </div>

                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium mb-2">Chia sẻ mã lớp</h3>
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-3xl font-mono font-bold tracking-widest">
                      {classData.code}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Học sinh có thể dùng mã này để tham gia lớp
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === "courses" && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Quản lý các khóa học và điều khiển nội dung hiển thị cho học
                  sinh.
                </p>
                <button
                  onClick={() =>
                    router.push(`/teacher/class/${classId}/courses`)
                  }
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 font-semibold text-lg"
                >
                  🎓 Quản lý khóa học và mở bài
                </button>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === "members" && (
              <>
                {classData.members?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có học sinh trong lớp
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            #
                          </th>
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
                            Ngày tham gia
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {classData.members?.map((member, index) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {member.username}
                            </td>
                            <td className="px-4 py-3">
                              {member.fullName || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {member.email || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {member.joinedAt
                                ? formatDate(member.joinedAt)
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() =>
                                  handleRemoveStudent(member.userId)
                                }
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Assignments Tab */}
            {activeTab === "assignments" && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Danh sách bài tập</h3>
                  <button
                    onClick={() =>
                      router.push(
                        `/teacher/assignment/create?classId=${classId}`,
                      )
                    }
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    + Tạo bài tập
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có bài tập nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() =>
                          router.push(`/teacher/assignment/${assignment.id}`)
                        }
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{assignment.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(assignment.startTime)} -{" "}
                              {formatDate(assignment.endTime)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                assignment.status === "published"
                                  ? "bg-green-100 text-green-800"
                                  : assignment.status === "closed"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {assignment.status === "published"
                                ? "Đang mở"
                                : assignment.status === "closed"
                                  ? "Đã đóng"
                                  : "Nháp"}
                            </span>
                            <div className="text-sm">
                              <span className="text-green-600 font-medium">
                                {assignment.passedCount || 0}
                              </span>
                              <span className="text-gray-400">
                                /{assignment.submissionCount || 0} bài nộp
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4">Thêm học sinh vào lớp</h2>

            <div className="flex-1 overflow-y-auto">
              {availableStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có học sinh nào có thể thêm
                </div>
              ) : (
                <div className="space-y-2">
                  {availableStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents((prev) => [
                              ...prev,
                              student.id,
                            ]);
                          } else {
                            setSelectedStudents((prev) =>
                              prev.filter((id) => id !== student.id),
                            );
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">
                          {student.fullName || student.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.username}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <span className="text-sm text-gray-500">
                Đã chọn: {selectedStudents.length} học sinh
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setSelectedStudents([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddStudents}
                  disabled={selectedStudents.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Thêm vào lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
