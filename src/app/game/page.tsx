"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

interface CourseFromDB {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  is_published: number;
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
      fetchCourses();
    }
  }, [router]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching courses:", error);
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
      <section className="px-16 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">Danh sách khóa học</h2>
            <p className="text-gray-700">
              Học Python qua các game tương tác thú vị.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <article
                key={course.id}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold flex-1">{course.title}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium whitespace-nowrap ml-2">
                    {course.difficulty}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">
                  {course.description || "Khóa học Python"}
                </p>
                <Link
                  href={`/course/${course.slug}`}
                  className="block w-full text-center px-4 py-2 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-colors"
                >
                  Vào khóa học
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
