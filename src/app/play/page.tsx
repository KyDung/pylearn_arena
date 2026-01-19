"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import courses from "@/data/courses.json";
import type { Course, User } from "@/types";
import { getUser } from "@/lib/auth";

// Dynamic import for Pyodide to avoid SSR issues
const PlayGameContent = dynamic(() => import("@/components/PlayGameContent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-12">
      Đang tải game...
    </div>
  ),
});

export default function PlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathParam = searchParams.get("path");

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      const redirect = pathParam
        ? `/login?next=play&path=${encodeURIComponent(pathParam)}`
        : "/login";
      router.push(redirect);
    } else {
      setUser(currentUser);
      setLoading(false);
    }
  }, [router, pathParam]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  const typedCourses = courses as Course[];
  let gameInfo: any = null;

  if (pathParam) {
    for (const course of typedCourses) {
      for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) {
          const games = lesson.games || [];
          for (const game of games) {
            if (game.path === pathParam) {
              gameInfo = { course, chapter, lesson, game };
              break;
            }
          }
          if (gameInfo) break;
        }
        if (gameInfo) break;
      }
      if (gameInfo) break;
    }
  }

  if (!pathParam || !gameInfo) {
    return (
      <main className="flex-1 px-16 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <p className="text-red-700 mb-4">
              Không tìm thấy nội dung. Vui lòng chọn lại bài học.
            </p>
            <Link href="/game" className="text-blue-600 hover:underline">
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const gameTitle = gameInfo.game.title;
  const lessonTitle = gameInfo.lesson.title;
  const courseTitle = gameInfo.course.title;
  const backLink = `/lesson/${gameInfo.course.id}/${gameInfo.lesson.id}`; // Quay về lesson
  const subtitle = [courseTitle, lessonTitle].filter(Boolean).join(" · ");

  return (
    <main className="flex-1">
      <section className="px-16 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{gameTitle}</h2>
              {subtitle && <p className="text-gray-600">{subtitle}</p>}
            </div>
            <Link
              href={backLink}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Quay lại
            </Link>
          </div>

          <PlayGameContent pathParam={pathParam} />
        </div>
      </section>
    </main>
  );
}
