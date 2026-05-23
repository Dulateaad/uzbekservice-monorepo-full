import { Suspense } from "react";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-8 text-slate-500">Загрузка…</main>}>
      <DashboardClient />
    </Suspense>
  );
}
