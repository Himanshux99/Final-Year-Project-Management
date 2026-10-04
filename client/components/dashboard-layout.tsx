"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, LogOut, KeyRound, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { authApi } from "@/lib/api";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  super_admin: "Coordinator",
};

function getInitials(name?: string) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, refreshAuth } = useAuth();
  const { showToast } = useToast();
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const loggingOut = React.useRef(false);

  // Route guard: unauthenticated users go to login, others to their own dashboard
  React.useEffect(() => {
    if (loading || loggingOut.current) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (!profile) {
      router.replace("/onboarding");
      return;
    }
    const role = profile.role;
    const allowed =
      pathname.startsWith("/dashboard/student")
        ? role === "student"
        : pathname.startsWith("/dashboard/admin")
          ? role === "super_admin"
          : pathname.startsWith("/dashboard/faculty")
            ? role === "faculty" || role === "super_admin"
            : true;
    if (!allowed) router.replace("/dashboard");
  }, [loading, user, profile, pathname, router]);

  // Close the settings menu on outside click or Escape
  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    loggingOut.current = true;
    authApi.logout();
    refreshAuth();
    showToast("Logged out successfully", "success");
    router.push("/");
  };

  const handleChangePassword = () => {
    setMenuOpen(false);
    setShowChangePassword(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-gray-900">
                  ProjectHub
                </h1>
                <p className="text-xs text-gray-500">{title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold leading-tight text-gray-900">
                    {profile?.name}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    {profile?.department && (
                      <span className="bg-indigo-50 px-1 text-[11px] font-semibold text-indigo-700">
                        {profile.department}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {profile?.role ? ROLE_LABELS[profile.role] : ""}
                    </span>
                  </div>
                </div>
                {/* <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-semibold text-white shadow-sm">
                  {getInitials(profile?.name)}
                </div> */}
              </div>

              {/* Settings menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Settings"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-gray-600 transition-colors hover:bg-gray-100 ${
                    menuOpen
                      ? "border-indigo-300 bg-gray-100"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Settings
                    className={`h-5 w-5 transition-transform duration-300 ${
                      menuOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  >
                    <div className="border-b border-gray-100 px-4 py-3 sm:hidden">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profile?.department}
                        {profile?.role ? ` • ${ROLE_LABELS[profile.role]}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleChangePassword}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <KeyRound className="h-4 w-4 text-gray-500" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
    </div>
  );
}
