"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth");
      } else if (user) {
        // Redirect based on role
        switch (user.role) {
          case "admin":
            router.push("/admin");
            break;
          case "worker":
            router.push("/employee");
            break;
          case "user":
            router.push("/client");
            break;
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="animate-spin w-8 h-8 border-4 border-[#568a56] border-t-transparent rounded-full"></div>
    </div>
  );
}
