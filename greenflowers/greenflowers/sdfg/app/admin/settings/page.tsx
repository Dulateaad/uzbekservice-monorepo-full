"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import AdminSettings from "@/components/admin/AdminSettings";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function AdminSettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div style={{ padding: 20 }}>
        <p>Доступ запрещен. Только для администраторов.</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Настройки администратора" requiredRole="admin">
      <AdminSettings />
    </DashboardLayout>
  );
}
