"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearUser, getUser } from "@/lib/auth";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseFromDB[]>([]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/login?next=game");
    } else {
      setUser(currentUser);
    }
  }, [router]);

  // Fetch courses khi user đã được set
  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    if (!user) {
      console.log("⚠️ User not loaded yet, skipping fetch");
      return;
    }

    try {
      // Teacher/Admin dùng API khác, Student dùng API có virtual courses
      const apiUrl =
        user.role === "student"
          ? "/api/student/courses"
          : "/api/teacher/courses";

      console.log(`🔍 Fetching courses from ${apiUrl}...`);
      console.log(`👤 Current user role:`, user.role);
      const response = await fetch(apiUrl);
      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      // Kiểm tra response text trước khi parse JSON
      const responseText = await response.text();
      console.log(
        "📄 Raw response (first 500 chars):",
        responseText.substring(0, 500),
      );

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        console.error("📄 Full response text:", responseText);
        setCourses([]);
        setLoading(false);
        return;
      }

      console.log("📊 Parsed data:", JSON.stringify(data, null, 2));

      if (data.success) {
        console.log("✅ Courses data:", data.data);
        console.log("📝 Courses count:", data.data?.length || 0);
        setCourses(data.data || []);
      } else {
        console.error(
          "❌ API returned error:",
          data.error || data.message || "Unknown error",
        );
        console.error("❌ Full error response:", data);
        setCourses([]); // Set empty để không bị undefined

        if (response.status === 401) {
          clearUser();
          router.push("/login?next=game");
          return;
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching courses:", error);
      setCourses([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
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
                  {course.is_virtual ? "Xem ngay →" : "Vào khóa học"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
