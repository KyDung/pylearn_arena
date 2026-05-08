"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Course {
  id: number;
  title: string;
  description: string;
  slug: string;
}

interface ClassCourse {
  id: number;
  class_id: number;
  course_id: number;
  title: string;
  description: string;
  slug: string;
  created_at: Date;
}

export default function ClassCoursesPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [classCourses, setClassCourses] = useState<ClassCourse[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      router.push("/login");
      return;
    }
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load class courses
      const coursesRes = await fetch(`/api/classes/${classId}/courses`);
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setClassCourses(data);
      }

      // Load all courses
      const allRes = await fetch("/api/courses");
      if (allRes.ok) {
        const data = await allRes.json();
        setAllCourses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (courseId: number) => {
    try {
      const res = await fetch(`/api/classes/${classId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (!res.ok) throw new Error("Failed to add course");

      alert("Đã thêm khóa học vào lớp!");
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleRemoveCourse = async (courseId: number) => {
    if (!confirm("Xóa khóa học khỏi lớp? Tất cả unlock settings sẽ bị xóa.")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/classes/${classId}/courses?courseId=${courseId}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Failed to remove course");

      alert("Đã xóa khóa học khỏi lớp!");
      loadData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const availableCourses = allCourses.filter(
    (c) => !classCourses.some((cc) => cc.course_id === c.id),
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Đang tải...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold">Quản lý khóa học cho lớp</h1>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Thêm khóa học
          </button>
        </div>

        {/* List of courses in class */}
        {classCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Lớp chưa có khóa học nào. Thêm khóa học để bắt đầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        `/teacher/class/${classId}/courses/${course.course_id}`,
                      )
                    }
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Quản lý mở bài
                  </button>
                  <button
                    onClick={() => handleRemoveCourse(course.course_id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Course Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Thêm khóa học vào lớp</h2>

              {availableCourses.length === 0 ? (
                <p className="text-gray-500">
                  Tất cả khóa học đã được thêm vào lớp.
                </p>
              ) : (
                <div className="space-y-4">
                  {availableCourses.map((course) => (
                    <div
                      key={course.id}
                      className="border rounded p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{course.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {course.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddCourse(course.id)}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
