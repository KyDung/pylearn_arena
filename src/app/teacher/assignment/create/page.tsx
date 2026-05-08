"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Class {
  id: number;
  name: string;
  code: string;
  student_count: number;
}

interface Game {
  id: number;
  title: string;
  game_type: string;
  course_name: string;
  lesson_name: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lateSubmission, setLateSubmission] = useState(false);
  const [latePenalty, setLatePenalty] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [showRanking, setShowRanking] = useState(true);
  const [publishNow, setPublishNow] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.user.role !== "teacher" && data.user.role !== "admin") {
        router.push("/");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch classes
      const classRes = await fetch("/api/classes");
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(classData.data || []);
      }

      // Fetch games (all available games)
      const gameRes = await fetch("/api/games");
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGames(gameData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classId || !gameId || !title || !startTime || !endTime) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      alert("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          game_id: gameId,
          title,
          description,
          start_time: startTime,
          end_time: endTime,
          late_submission: lateSubmission,
          late_penalty: latePenalty,
          max_attempts: maxAttempts,
          show_ranking: showRanking,
          status: publishNow ? "published" : "draft",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Lỗi tạo bài tập");
      }

      const data = await res.json();
      router.push(`/teacher/assignment/${data.data.id}`);
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  // Set default times
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60000); // 7 days

    // Format for datetime-local input
    const formatDate = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartTime(formatDate(start));
    setEndTime(formatDate(end));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="text-gray-400 hover:text-white">
              ← Quay lại
            </Link>
            <h1 className="text-xl font-bold text-white">Tạo bài tập mới</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">
              Thông tin cơ bản
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Tiêu đề <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none"
                  placeholder="VD: Bài tập tuần 1 - Biến và kiểu dữ liệu"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Mô tả
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none resize-none"
                  placeholder="Mô tả chi tiết về bài tập..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Lớp <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={classId ?? ""}
                    onChange={(e) =>
                      setClassId(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="" className="bg-[#1a1a2e]">
                      Chọn lớp...
                    </option>
                    {classes.map((cls) => (
                      <option
                        key={cls.id}
                        value={cls.id}
                        className="bg-[#1a1a2e]"
                      >
                        {cls.name} ({cls.student_count} học sinh)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Game bài tập <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={gameId ?? ""}
                    onChange={(e) =>
                      setGameId(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="" className="bg-[#1a1a2e]">
                      Chọn game...
                    </option>
                    {games.map((game) => (
                      <option
                        key={game.id}
                        value={game.id}
                        className="bg-[#1a1a2e]"
                      >
                        {game.title} ({game.game_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Thời gian</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Bắt đầu <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Kết thúc <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateSubmission}
                  onChange={(e) => setLateSubmission(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/10 border-white/20"
                />
                <span className="text-gray-300">Cho phép nộp muộn</span>
              </label>

              {lateSubmission && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Trừ điểm:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={latePenalty}
                    onChange={(e) =>
                      setLatePenalty(parseInt(e.target.value) || 0)
                    }
                    className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-center"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Quy tắc</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-gray-400 text-sm w-32">
                  Số lần nộp:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={maxAttempts ?? ""}
                    onChange={(e) =>
                      setMaxAttempts(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="∞"
                  />
                  <span className="text-gray-400 text-sm">
                    (để trống = không giới hạn)
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRanking}
                  onChange={(e) => setShowRanking(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/10 border-white/20"
                />
                <span className="text-gray-300">
                  Hiển thị bảng xếp hạng cho học sinh
                </span>
              </label>
            </div>
          </div>

          {/* Publish Options */}
          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Xuất bản</h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5">
                <input
                  type="radio"
                  name="publish"
                  checked={!publishNow}
                  onChange={() => setPublishNow(false)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-white font-medium">Lưu nháp</span>
                  <p className="text-gray-400 text-sm">
                    Bài tập sẽ chưa hiển thị với học sinh
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5">
                <input
                  type="radio"
                  name="publish"
                  checked={publishNow}
                  onChange={() => setPublishNow(true)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-white font-medium">Mở ngay</span>
                  <p className="text-gray-400 text-sm">
                    Học sinh có thể xem và làm bài ngay khi đến giờ bắt đầu
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/teacher"
              className="flex-1 py-3 bg-white/10 text-white rounded-xl text-center hover:bg-white/20 transition font-medium"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {submitting
                ? "Đang tạo..."
                : publishNow
                  ? "Tạo và mở bài tập"
                  : "Lưu nháp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
