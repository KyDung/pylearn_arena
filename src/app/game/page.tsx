"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearUser, getUser, setUser as saveUser } from "@/lib/auth";
import type { User } from "@/types";

interface CourseFromDB {
  id: string | number;
  slug: string;
  title: string;
  description: string;
  difficulty_level?: string;
  is_virtual?: boolean;
  type?: string;
  count?: number;
}

export default function GamePage() {
  const router = useRouter();
  const [user, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseFromDB[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyLogin = async () => {
      const cachedUser = getUser();
      if (!cachedUser) {
        clearUser();
        router.replace("/login?next=game");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();

        if (!isMounted) return;

        if (!response.ok || !data.success || !data.user) {
          clearUser();
          router.replace("/login?next=game");
          return;
        }

        saveUser(data.user);
        setCurrentUser(data.user);
      } catch (error) {
        if (!isMounted) return;
        console.error("Không thể kiểm tra trạng thái đăng nhập:", error);
        setError("Không thể kiểm tra trạng thái đăng nhập. Vui lòng thử lại.");
        setLoading(false);
      }
    };

    verifyLogin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      const apiUrl =
        user.role === "student"
          ? "/api/student/courses"
          : "/api/teacher/courses";

      const response = await fetch(apiUrl, { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        clearUser();
        router.replace("/login?next=game");
        return;
      }

      if (!response.ok || !data?.success) {
        console.error("Không thể tải khóa học:", data?.error || data?.message);
        setError(data?.error || data?.message || "Không thể tải danh sách khóa học.");
        setCourses([]);
        return;
      }

      setCourses(data.data || []);
    } catch (error) {
      console.error("Không thể tải khóa học:", error);
      setError("Không thể tải danh sách khóa học. Vui lòng thử lại.");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (error) {
    return (
      <main className="flex-1">
        <section className="px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-3">
              Không thể mở danh sách game
            </h2>
            <p className="text-gray-700 mb-5">{error}</p>
            <Link
              href="/login?next=game"
              className="inline-block px-5 py-2.5 bg-[#ff7a50] hover:bg-[#ff6940] text-white rounded-lg font-medium transition-colors"
            >
              Đăng nhập lại
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="px-4 sm:px-8 lg:px-16 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Danh sách khóa học
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              Học Python qua các game tương tác thú vị.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {courses.map((course) => (
              <article
                key={course.id}
                className={`p-5 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all ${
                  course.is_virtual
                    ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold flex-1 leading-tight">
                    {course.title}
                  </h3>
                  {course.is_virtual ? (
                    <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ml-2">
                      {course.count || 0} đang mở
                    </span>
                  ) : (
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ml-2">
                      {course.difficulty_level || "Cơ bản"}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">
                  {course.description || "Khóa học Python"}
                </p>
                <Link
                  href={`/course/${course.is_virtual ? course.id : course.slug}`}
                  className={`block w-full text-center px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-all ${
                    course.is_virtual
                      ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"
                      : "bg-[#ff7a50] hover:bg-[#ff6940] text-white hover:shadow-lg"
                  }`}
                >
                  {course.is_virtual ? "Xem ngay ->" : "Vào khóa học"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
