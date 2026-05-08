"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Class {
  id: number;
  name: string;
  code: string;
  student_count?: number;
}

interface Course {
  id: number;
  title: string;
  slug: string;
}

interface Lesson {
  id: number;
  title: string;
  topic_title?: string;
}

interface Game {
  id: number;
  title: string;
  game_path: string;
  lesson_title?: string;
}

interface Contest {
  id: number;
  title: string;
  description: string;
  contest_code: string;
  created_by: number;
  creator_name?: string;
  class_id: number | null;
  class_name?: string;
  course_id: number | null;
  course_title?: string;
  lesson_id: number | null;
  lesson_title?: string;
  open_all_games: boolean;
  status: "draft" | "active" | "closed";
  start_time: string | null;
  end_time: string | null;
  show_ranking: boolean;
  allow_resubmit: boolean;
  max_attempts: number | null;
  game_count?: number;
  submission_count?: number;
  created_at: string;
}

interface ContestGame {
  id: number;
  game_id: number;
  game_title: string;
  game_path: string;
}

export default function ContestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [contestGames, setContestGames] = useState<ContestGame[]>([]);
  const [contestRankings, setContestRankings] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    courseId: "",
    lessonId: "",
    openAllGames: true,
    selectedGameIds: [] as number[],
    startTime: "",
    endTime: "",
    showRanking: true,
    allowResubmit: true,
    maxAttempts: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.role === "admin" || data.user.role === "teacher") {
          setUser(data.user);
          setLoading(false);
          await Promise.all([fetchContests(), fetchClasses(), fetchCourses()]);
        } else {
          // Student - redirect to student contests page
          router.replace("/student/contests");
          return;
        }
      } else {
        router.replace("/login?next=contests");
      }
    } catch (error) {
      router.replace("/login?next=contests");
    }
  };

  const fetchContests = async () => {
    const res = await fetch("/api/contests");
    const data = await res.json();
    if (data.success) {
      setContests(data.data);
    }
  };

  const fetchClasses = async () => {
    const res = await fetch("/api/classes");
    const data = await res.json();
    if (data.success) {
      setClasses(data.data?.items || data.data || []);
    }
  };

  const fetchCourses = async () => {
    const res = await fetch("/api/admin/courses");
    const data = await res.json();
    if (data.success) {
      setCourses(data.data || []);
    }
  };

  const fetchLessonsForCourse = async (courseId: number) => {
    // Fetch all lessons for this course through topics
    const res = await fetch(`/api/courses/${courseId}/lessons`);
    const data = await res.json();
    if (data.success) {
      setLessons(data.data || []);
    }
  };

  const fetchGamesForLesson = async (lessonId: number) => {
    const res = await fetch(`/api/courses/0/lessons/${lessonId}/games`);
    const data = await res.json();
    if (data.success) {
      setGames(data.data || []);
    }
  };

  const handleCourseChange = async (courseId: string) => {
    setFormData({ ...formData, courseId, lessonId: "", selectedGameIds: [] });
    setLessons([]);
    setGames([]);
    if (courseId) {
      await fetchLessonsForCourse(parseInt(courseId));
    }
  };

  const handleLessonChange = async (lessonId: string) => {
    setFormData({ ...formData, lessonId, selectedGameIds: [] });
    setGames([]);
    if (lessonId) {
      await fetchGamesForLesson(parseInt(lessonId));
    }
  };

  const handleCreateContest = async () => {
    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          classId: formData.classId ? parseInt(formData.classId) : null,
          courseId: formData.courseId ? parseInt(formData.courseId) : null,
          lessonId: formData.lessonId ? parseInt(formData.lessonId) : null,
          openAllGames: formData.openAllGames,
          gameIds: formData.openAllGames ? undefined : formData.selectedGameIds,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          showRanking: formData.showRanking,
          allowResubmit: formData.allowResubmit,
          maxAttempts: formData.maxAttempts
            ? parseInt(formData.maxAttempts)
            : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        await fetchContests();
        alert("Tạo cuộc thi thành công!");
      } else {
        alert(data.error || "Lỗi tạo cuộc thi");
      }
    } catch (error) {
      alert("Lỗi kết nối server");
    }
  };

  const handleActivateContest = async (contestId: number) => {
    const res = await fetch(`/api/contests/${contestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate" }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchContests();
    }
  };

  const handleCloseContest = async (contestId: number) => {
    if (!confirm("Bạn có chắc muốn đóng cuộc thi này?")) return;
    const res = await fetch(`/api/contests/${contestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchContests();
    }
  };

  const handleDeleteContest = async (contestId: number) => {
    if (
      !confirm("Bạn có chắc muốn xóa cuộc thi này? Tất cả bài nộp sẽ bị xóa!")
    )
      return;
    const res = await fetch(`/api/contests/${contestId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      await fetchContests();
    }
  };

  const handleViewDetail = async (contest: Contest) => {
    setSelectedContest(contest);
    // Fetch contest details
    const res = await fetch(`/api/contests/${contest.id}`);
    const data = await res.json();
    if (data.success) {
      setContestGames(data.data.games || []);
      setContestRankings(data.data.rankings || []);
    }
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      classId: "",
      courseId: "",
      lessonId: "",
      openAllGames: true,
      selectedGameIds: [],
      startTime: "",
      endTime: "",
      showRanking: true,
      allowResubmit: true,
      maxAttempts: "",
    });
    setLessons([]);
    setGames([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
            Nháp
          </span>
        );
      case "active":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
            Đang mở
          </span>
        );
      case "closed":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
            Đã đóng
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🏆 Quản lý cuộc thi
            </h1>
            <p className="text-gray-600 text-sm">
              {user?.role === "admin"
                ? "Xem tất cả cuộc thi trong hệ thống"
                : "Tạo và quản lý cuộc thi của bạn"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              ← Quay lại
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ➕ Tạo cuộc thi
            </button>
          </div>
        </div>

        {/* Stats for Admin */}
        {user?.role === "admin" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">
                {contests.length}
              </div>
              <div className="text-gray-500 text-sm">Tổng cuộc thi</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">
                {contests.filter((c) => c.status === "active").length}
              </div>
              <div className="text-gray-500 text-sm">Đang mở</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {contests.filter((c) => c.status === "draft").length}
              </div>
              <div className="text-gray-500 text-sm">Bản nháp</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-purple-600">
                {contests.reduce(
                  (sum, c) => sum + (c.submission_count || 0),
                  0,
                )}
              </div>
              <div className="text-gray-500 text-sm">Tổng bài nộp</div>
            </div>
          </div>
        )}

        {/* Contests List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Cuộc thi
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Mã
                </th>
                {user?.role === "admin" && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Người tạo
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Lớp
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Games
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Bài nộp
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => {
                // Kiểm tra quyền quản lý: admin toàn quyền, teacher chỉ contest của mình
                const canManage =
                  user?.role === "admin" || contest.created_by === user?.id;

                return (
                  <tr key={contest.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {contest.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {contest.course_title && `${contest.course_title} > `}
                        {contest.lesson_title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {contest.contest_code}
                      </code>
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contest.creator_name || "N/A"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contest.class_name || "Tất cả"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contest.game_count || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contest.submission_count || 0}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(contest.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewDetail(contest)}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          👁 Xem
                        </button>
                        {canManage && contest.status === "draft" && (
                          <button
                            onClick={() => handleActivateContest(contest.id)}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            ▶ Mở
                          </button>
                        )}
                        {canManage && contest.status === "active" && (
                          <button
                            onClick={() => handleCloseContest(contest.id)}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                          >
                            ⏸ Đóng
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleDeleteContest(contest.id)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            🗑
                          </button>
                        )}
                        {!canManage && (
                          <span className="text-xs text-gray-400 italic">
                            Chỉ xem
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {contests.length === 0 && (
                <tr>
                  <td
                    colSpan={user?.role === "admin" ? 8 : 7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {user?.role === "admin"
                      ? "Chưa có cuộc thi nào trong hệ thống."
                      : 'Bạn chưa tạo cuộc thi nào. Nhấn "Tạo cuộc thi" để bắt đầu.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Contest Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Tạo cuộc thi mới</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tiêu đề cuộc thi *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="VD: Cuộc thi Python cơ bản"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Mô tả về cuộc thi..."
                  />
                </div>

                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Lớp học (tuỳ chọn)
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) =>
                      setFormData({ ...formData, classId: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Tất cả học sinh --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Để trống để mở cho tất cả học sinh
                  </p>
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Khóa học
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">-- Chọn khóa học --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Selection */}
                {lessons.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Bài học
                    </label>
                    <select
                      value={formData.lessonId}
                      onChange={(e) => handleLessonChange(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">-- Chọn bài học --</option>
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.topic_title && `[${l.topic_title}] `}
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Game Selection */}
                {formData.lessonId && games.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Chọn games
                    </label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={formData.openAllGames}
                          onChange={() =>
                            setFormData({ ...formData, openAllGames: true })
                          }
                        />
                        Mở tất cả games ({games.length})
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={!formData.openAllGames}
                          onChange={() =>
                            setFormData({ ...formData, openAllGames: false })
                          }
                        />
                        Chọn từng game
                      </label>
                    </div>

                    {!formData.openAllGames && (
                      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                        {games.map((g) => (
                          <label
                            key={g.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedGameIds.includes(g.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedGameIds: [
                                      ...formData.selectedGameIds,
                                      g.id,
                                    ],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedGameIds:
                                      formData.selectedGameIds.filter(
                                        (id) => id !== g.id,
                                      ),
                                  });
                                }
                              }}
                            />
                            {g.title}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Thời gian bắt đầu
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Thời gian kết thúc
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.showRanking}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showRanking: e.target.checked,
                        })
                      }
                    />
                    Hiển thị xếp hạng
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allowResubmit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowResubmit: e.target.checked,
                        })
                      }
                    />
                    Cho phép nộp lại
                  </label>
                  <div className="flex items-center gap-2">
                    <label>Số lần nộp tối đa:</label>
                    <input
                      type="number"
                      value={formData.maxAttempts}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxAttempts: e.target.value,
                        })
                      }
                      className="w-20 border rounded px-2 py-1"
                      min="1"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateContest}
                  disabled={!formData.title}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Tạo cuộc thi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contest Detail Modal */}
        {showDetailModal && selectedContest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedContest.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-blue-100 px-2 py-1 rounded text-sm">
                      {selectedContest.contest_code}
                    </code>
                    {getStatusBadge(selectedContest.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: Contest Info & Games */}
                <div>
                  <h3 className="font-semibold mb-2">📋 Thông tin</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    {selectedContest.class_name && (
                      <p>
                        <strong>Lớp:</strong> {selectedContest.class_name}
                      </p>
                    )}
                    {selectedContest.course_title && (
                      <p>
                        <strong>Khóa học:</strong>{" "}
                        {selectedContest.course_title}
                      </p>
                    )}
                    {selectedContest.lesson_title && (
                      <p>
                        <strong>Bài học:</strong> {selectedContest.lesson_title}
                      </p>
                    )}
                    {selectedContest.start_time && (
                      <p>
                        <strong>Bắt đầu:</strong>{" "}
                        {new Date(selectedContest.start_time).toLocaleString(
                          "vi-VN",
                        )}
                      </p>
                    )}
                    {selectedContest.end_time && (
                      <p>
                        <strong>Kết thúc:</strong>{" "}
                        {new Date(selectedContest.end_time).toLocaleString(
                          "vi-VN",
                        )}
                      </p>
                    )}
                  </div>

                  <h3 className="font-semibold mt-4 mb-2">
                    🎮 Games ({contestGames.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {contestGames.map((g, i) => (
                      <div key={g.id} className="flex items-center gap-2 py-1">
                        <span className="text-gray-500">{i + 1}.</span>
                        <span>{g.game_title}</span>
                      </div>
                    ))}
                    {contestGames.length === 0 && (
                      <p className="text-gray-500">Chưa có game nào</p>
                    )}
                  </div>
                </div>

                {/* Right: Rankings */}
                <div>
                  <h3 className="font-semibold mb-2">🏆 Bảng xếp hạng</h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Tên</th>
                          <th className="px-3 py-2 text-right">Điểm</th>
                          <th className="px-3 py-2 text-right">Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contestRankings.map((r) => (
                          <tr key={r.user_id} className="border-t">
                            <td className="px-3 py-2 font-medium">
                              {r.rank_position <= 3
                                ? ["🥇", "🥈", "🥉"][r.rank_position - 1]
                                : r.rank_position}
                            </td>
                            <td className="px-3 py-2">
                              {r.full_name || r.username}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {r.total_score}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {r.games_completed}/{r.total_games}
                            </td>
                          </tr>
                        ))}
                        {contestRankings.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-center text-gray-500"
                            >
                              Chưa có bài nộp
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
