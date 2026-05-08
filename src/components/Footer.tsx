"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

export default function Footer() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <footer className="mt-auto py-4 sm:py-6 px-4 sm:px-8 lg:px-16 text-xs sm:text-sm text-gray-600 border-t border-gray-200 bg-white/50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <span className="text-center sm:text-left">
          Runtime: chưa tải Pyodide
        </span>
        {user && (
          <span className="text-center font-medium">
            👋 {user.fullName || user.username} (
            {user.role === "admin"
              ? "Admin"
              : user.role === "teacher"
                ? "Giáo viên"
                : "Học sinh"}
            )
          </span>
        )}
        <span className="text-center sm:text-right text-gray-500">
          Phaser + Pyodide learning lab
        </span>
      </div>
    </footer>
  );
}
