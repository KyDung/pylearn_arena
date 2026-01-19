"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@/types";
import { getUser } from "@/lib/auth";

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
}

interface Topic {
  id: number;
  slug: string;
  title: string;
  description: string;
  lesson_count: number;
}

interface Lesson {
  id: number;
  slug: string;
  title: string;
  description: string;
  summary: string;
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<{
    [key: number]: boolean;
  }>({});
  const [lessonsMap, setLessonsMap] = useState<{
    [key: number]: Lesson[];
  }>({});
  const { courseId } = use(params);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push(`/login?next=course&course=${encodeURIComponent(courseId)}`);
    } else {
      setUser(currentUser);
      fetchCourseData();
    }
  }, [router, courseId]);

  const fetchCourseData = async () => {
    try {
      // Fetch course info
      const courseRes = await fetch(`/api/courses`);
      const courseData = await courseRes.json();

      if (courseData.success) {
        const foundCourse = courseData.courses.find(
          (c: Course) => c.slug === courseId,
        );

        if (foundCourse) {
          setCourse(foundCourse);

          // Fetch topics
          const topicsRes = await fetch(`/api/courses/${courseId}/topics`);
          const topicsData = await topicsRes.json();

          if (topicsData.success && topicsData.topics.length > 0) {
            setTopics(topicsData.topics);
            // Auto expand first topic
            setExpandedTopics({ [topicsData.topics[0].id]: true });
            // Load lessons for first topic
            loadLessons(topicsData.topics[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (topicId: number) => {
    if (lessonsMap[topicId]) return; // Already loaded

    try {
      const res = await fetch(
        `/api/courses/${courseId}/topics/${topicId}/lessons`,
      );
      const data = await res.json();

      if (data.success) {
        setLessonsMap((prev) => ({ ...prev, [topicId]: data.lessons }));
      }
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
  };

  const toggleTopic = (topicId: number) => {
    setExpandedTopics((prev) => {
      const newState = { ...prev, [topicId]: !prev[topicId] };
      // Load lessons when expanding
      if (newState[topicId]) {
        loadLessons(topicId);
      }
      return newState;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  if (!course) {
    return (
      <main className="flex-1 px-16 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <p className="text-red-700 mb-4">
              Không tìm thấy khóa học. Vui lòng chọn lại.
            </p>
            <Link href="/game" className="text-blue-600 hover:underline">
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="px-16 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link
              href="/game"
              className="text-blue-600 hover:underline mb-4 inline-block"
            >
              ← Quay lại danh sách khóa học
            </Link>
            <h2 className="text-4xl font-bold mb-4">{course.title}</h2>
            <p className="text-gray-700">{course.description}</p>
          </div>

          <div className="space-y-6">
            {topics.map((topic) => (
              <article
                key={topic.id}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                {/* Topic Header */}
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{topic.title}</h3>
                    <p className="text-gray-600">{topic.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {topic.lesson_count} bài học
                    </span>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${
                        expandedTopics[topic.id] ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Lessons List */}
                {expandedTopics[topic.id] && (
                  <div className="border-t border-gray-200">
                    {lessonsMap[topic.id] ? (
                      lessonsMap[topic.id].length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {lessonsMap[topic.id].map((lesson) => (
                            <li key={lesson.id}>
                              <Link
                                href={`/lesson/${courseId}/${lesson.slug}`}
                                className="block p-4 hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-lg mb-1">
                                      {lesson.title}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {lesson.summary || lesson.description}
                                    </p>
                                  </div>
                                  <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-gray-500 text-center">
                          Chưa có bài học nào
                        </div>
                      )
                    ) : (
                      <div className="p-4 text-gray-500 text-center">
                        Đang tải...
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
