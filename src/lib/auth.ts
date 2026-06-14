import type { User } from "@/types";

const STORAGE_KEY = "pylearn-user";
const AUTH_CHANGE_EVENT = "pylearn-auth-change";

const notifyAuthChange = (): void => {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const getUser = (): User | null => {
  if (typeof window === "undefined") return null;

  // First try localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }

  // Fallback to cookie
  const cookies = document.cookie.split(";");
  const userCookie = cookies.find((c) => c.trim().startsWith("user-info="));
  if (userCookie) {
    try {
      const cookieValue = decodeURIComponent(userCookie.split("=")[1]);
      const user = JSON.parse(cookieValue);
      // Sync back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch {}
  }

  return null;
};

export const setUser = (user: User): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  notifyAuthChange();
};

export const clearUser = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  notifyAuthChange();
};

export const subscribeToAuthChanges = (
  listener: (user: User | null) => void,
): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => listener(getUser());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handleChange();
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);
  handleChange();

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
};

export const login = async (
  username: string,
  password: string,
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    setUser(data.user);
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: "Không thể kết nối đến server" };
  }
};

export const logout = async (): Promise<void> => {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout error:", error);
  }
  clearUser();
};
