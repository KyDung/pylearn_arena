"use client";

import { useEffect, useState } from "react";
import { subscribeToAuthChanges } from "@/lib/auth";
import type { User } from "@/types";

export default function Footer() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return subscribeToAuthChanges(setUser);
  }, []);

  return (
    <footer className="mt-auto py-4 sm:py-6 px-4 sm:px-8 lg:px-16 text-xs sm:text-sm text-gray-600 border-t border-gray-200 bg-white/50">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
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
      </div>
    </footer>
  );
}
