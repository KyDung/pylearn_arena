"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshUser } from "@/lib/auth";
import type { User } from "@/types";

/** Resolve browser authentication after hydration; API permissions remain authoritative. */
export function usePageUser(
  roles = "admin,teacher,student",
  loginPath = "/login",
  deniedPath = "/",
) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    void refreshUser().then(current => {
      if (!active) return;
      if (!current) {
        router.replace(loginPath);
      } else if (!roles.split(",").includes(current.role)) {
        router.replace(deniedPath);
      } else {
        setUser(current);
      }
    });
    return () => { active = false; };
  }, [roles, loginPath, deniedPath, router]);

  return user;
}
