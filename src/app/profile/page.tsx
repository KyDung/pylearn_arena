"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { usePageUser } from "@/hooks/usePageUser";

export default function ProfilePage() {
  const router = useRouter();
  const user = usePageUser("admin,teacher,student", "/login?next=profile");

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">Đang tải...</div>
    );
  }

  return (
    <main className="flex-1">
      <section className="px-16 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">Hồ sơ người dùng</h2>
            <p className="text-gray-700">Thông tin tài khoản của bạn.</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md space-y-6">
            <div>
              <div className="text-2xl font-bold mb-2">
                {user?.fullName || user?.username}
              </div>
              <div className="text-gray-600">@{user?.username}</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Vai trò:</span>
                <span className="font-semibold">
                  {user?.role === "admin" ? (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      Quản trị viên
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {user.role === "teacher" ? "Giáo viên" : "Học sinh"}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trạng thái:</span>
                <span className="text-green-600 font-semibold">
                  Đã đăng nhập
                </span>
              </div>
              {user?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold">{user.email}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
