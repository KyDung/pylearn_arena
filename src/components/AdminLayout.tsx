"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: ReactNode;
}

export default function AdminLayout({
  children,
  title,
  subtitle,
  icon = "🛡️",
  actions,
}: AdminLayoutProps) {
  const router = useRouter();
  const showLocalContentTools =
    process.env.NEXT_PUBLIC_LOCAL_CONTENT_TOOLS === "true";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header with Gradient */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-3">
                <span className="text-4xl">{icon}</span>
                {title}
              </h1>
              {subtitle && (
                <p className="text-blue-100 mt-2 text-sm lg:text-base">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Quick Nav + Actions */}
            <div className="flex flex-wrap gap-2 items-center">
              {actions}

              {/* Quick Navigation */}
              <div className="flex gap-2 border-l border-white/30 pl-2 ml-2">
                <button
                  onClick={() => router.push("/admin")}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
                  title="Dashboard"
                >
                  📊
                </button>
                <button
                  onClick={() => router.push("/admin/accounts")}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
                  title="Quản lý tài khoản"
                >
                  👥
                </button>
                <button
                  onClick={() => router.push("/teacher/classes")}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
                  title="Quản lý lớp học"
                >
                  📚
                </button>
                <button
                  onClick={() => router.push("/dev/content-manager")}
                  style={{ display: showLocalContentTools ? undefined : "none" }}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-300 text-white text-sm font-medium border border-white/30"
                  title="Quản lý nội dung"
                >
                  📦
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-blue-50 transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105 transform"
                >
                  ← Trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

// Reusable Stats Card Component
interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  subtext?: string;
  gradient: "blue" | "green" | "purple" | "orange" | "red" | "teal" | "pink";
  onClick?: () => void;
}

export function StatCard({
  icon,
  value,
  label,
  subtext,
  gradient,
  onClick,
}: StatCardProps) {
  const gradientClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-green-600",
    purple: "from-violet-500 to-purple-600",
    orange: "from-orange-500 to-red-600",
    red: "from-red-500 to-pink-600",
    teal: "from-teal-500 to-cyan-600",
    pink: "from-pink-500 to-rose-600",
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-gradient-to-br ${gradientClasses[gradient]} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 text-white hover:scale-105 transform ${onClick ? "cursor-pointer" : ""} overflow-hidden relative`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="text-5xl filter drop-shadow-lg">{icon}</div>
          <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
          {value}
        </div>
        <div className="text-white/90 text-sm font-medium mb-3">{label}</div>
        {subtext && (
          <div className="flex items-center text-xs text-white/70">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                clipRule="evenodd"
              />
            </svg>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Card Component
interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  headerActions?: ReactNode;
}

export function Card({
  children,
  title,
  subtitle,
  className = "",
  headerActions,
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}
    >
      {(title || subtitle || headerActions) && (
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {headerActions && <div>{headerActions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// Modern Button Component
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  type = "button",
  className = "",
}: ButtonProps) {
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl",
    secondary:
      "bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300",
    success:
      "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg",
    danger:
      "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg",
    warning:
      "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group ${variantClasses[variant]} ${sizeClasses[size]} ${className} rounded-xl transition-all duration-300 font-semibold hover:scale-105 transform flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      {icon && (
        <span className="group-hover:rotate-12 transition-transform">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

// Loading Spinner
export function LoadingSpinner({
  message = "Đang tải...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
      <p className="text-gray-600 text-lg font-medium">{message}</p>
    </div>
  );
}

// Empty State
export function EmptyState({
  icon = "📭",
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      {action && action}
    </div>
  );
}
