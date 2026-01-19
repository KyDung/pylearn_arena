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
    <footer className="mt-auto py-6 px-16 text-sm text-gray-600 flex items-center justify-between border-t border-gray-200">
      <span>Runtime: chưa tải Pyodide</span>
      {user && (
        <span>
          Xin chào, {user.fullName || user.username} (
          {user.role === "admin" ? "Admin" : "Học sinh"})
        </span>
      )}
      <span>Phaser + Pyodide learning lab</span>
    </footer>
  );
}
