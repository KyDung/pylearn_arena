"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { User } from "@/types";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-6 px-16 py-6 bg-[#f6f2ec]/85 backdrop-blur-md">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-2xl tracking-tight"
      >
        <span className="bg-[#ff7a50] text-white px-3 py-1 rounded-full text-sm font-bold">
          Py
        </span>
        Learn Arena
      </Link>

      <nav className="flex items-center gap-6">
        <Link href="/" className={pathname === "/" ? "font-semibold" : ""}>
          Trang chủ
        </Link>
        <Link
          href="/game"
          className={
            pathname?.startsWith("/game") ||
            pathname?.startsWith("/course") ||
            pathname?.startsWith("/lesson") ||
            pathname?.startsWith("/play")
              ? "font-semibold"
              : ""
          }
        >
          Học qua game
        </Link>
      </nav>

      <div className="flex items-center gap-3 ml-auto">
        {!user ? (
          <Link href="/login" className="text-sm">
            Đăng nhập
          </Link>
        ) : (
          <Link href="/profile" className="text-sm">
            Hồ sơ
          </Link>
        )}
        <button className="px-4 py-2 bg-[#ff7a50] text-white rounded-lg text-sm font-medium hover:bg-[#ff6940] transition-colors">
          Bắt đầu miễn phí
        </button>
      </div>
    </header>
  );
}
