"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RiskFlagBanner } from "@/components/RiskFlagBanner";
import { LoadTracker } from "@/components/LoadTracker";
import { JobStatusPoll } from "@/components/JobStatusPoll";

export function DashboardClient() {
  const sp = useSearchParams();
  const jobId = sp.get("jobId") ?? undefined;

  return (
    <main className="mx-auto max-w-4xl p-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Дашборд</h1>
        <Link href="/upload" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Загрузить видео
        </Link>
      </header>
      <RiskFlagBanner />
      {jobId && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2">Задача анализа</h2>
          <JobStatusPoll jobId={jobId} />
        </section>
      )}
      <section>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Нагрузка (ТЗ §6.2 LoadTracker)</h2>
        <LoadTracker />
      </section>
      <section>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Последние сессии</h2>
        <p className="text-slate-500 text-sm">
          Список из Firestore <code className="text-blue-400">sessions</code> — подключите подписку в следующем
          шаге.
        </p>
      </section>
    </main>
  );
}
