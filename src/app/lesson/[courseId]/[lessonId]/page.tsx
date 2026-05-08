"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@/types";
import { getUser } from "@/lib/auth";

interface Game {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  path: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  games?: Game[];
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const { courseId, lessonId } = use(params);

  const fetchLessonData = useCallback(async () => {
    try {
      // Fetch games từ API MySQL
      const response = await fetch(
        `/api/courses/${courseId}/lessons/${lessonId}/games`,
      );
      const data = await response.json();

      if (data.success && data.games) {
        // Convert API data to match Game interface
        const apiGames = data.games.map((g: any) => ({
          id: g.slug,
          title: g.title,
          description: g.description,
          path: g.path,
        }));

        setGames(apiGames);

        // Set lesson info from first game or fallback
        setLesson({
          id: lessonId,
          title: data.games[0]?.title?.split(":")[0] || "Bài học",
          description: "Học qua mini game",
          games: apiGames,
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching lesson data:", error);
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push(
        `/login?next=lesson&course=${encodeURIComponent(
          courseId,
        )}&lesson=${encodeURIComponent(lessonId)}`,
      );
    } else {
      setUser(currentUser);
      fetchLessonData();
    }
  }, [router, courseId, lessonId, fetchLessonData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (!lesson) {
    return (
      <main className="flex-1 px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-5 sm:p-6 rounded-lg">
            <p className="text-red-700 mb-3 sm:mb-4 text-sm sm:text-base">
              Không tìm thấy bài học. Vui lòng chọn lại.
            </p>
            <Link
              href="/game"
              className="text-blue-600 hover:underline text-sm sm:text-base"
            >
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <Link
              href={`/course/${courseId}`}
              className="text-blue-600 hover:underline mb-3 sm:mb-4 inline-block text-sm sm:text-base"
            >
              ← Quay lại khóa học
            </Link>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              {lesson.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
              {lesson.summary || "Bài học thú vị"}
            </p>
            <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>🎮 {games.length} games</span>
            </div>
          </div>

          {games.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {games.map((game, index) => (
                <article
                  key={game.id}
                  className="bg-white p-5 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base sm:text-lg flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold break-words">
                          {game.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
                    {game.description ||
                      game.summary ||
                      "Thử thách lập trình thú vị!"}
                  </p>
                  <Link
                    href={`/play?path=${encodeURIComponent(game.path)}`}
                    className="block w-full text-center px-4 py-2.5 sm:py-2 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-all hover:shadow-lg text-sm sm:text-base"
                  >
                    Chơi game
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md text-center">
              <p className="text-gray-500 text-sm sm:text-base">
                Bài học này chưa có game nào.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
