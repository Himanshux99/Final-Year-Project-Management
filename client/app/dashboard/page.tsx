"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!profile) {
      router.push("/onboarding");
      return;
    }

    // Redirect to role-specific dashboard
    switch (profile.role) {
      case "student":
        router.push("/dashboard/student");
        break;
      case "faculty":
        router.push("/dashboard/faculty");
        break;
      case "super_admin":
        // Super admins go to admin dashboard by default
        router.push("/dashboard/admin");
        break;
    }
  }, [user, profile, loading, router]);

  return <PageSkeleton />;
}

