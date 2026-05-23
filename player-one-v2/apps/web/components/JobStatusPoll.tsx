"use client";

import { useEffect, useState } from "react";
import { getAnalysisJob } from "@/lib/player-one-api";
import { usePlayerOneAuth } from "@/components/PlayerOneProviders";

export function JobStatusPoll({ jobId }: { jobId: string }) {
  const { getIdToken } = usePlayerOneAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const t = await getIdToken();
        if (!t) return;
        const j = await getAnalysisJob(jobId, t);
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, getIdToken]);

  if (err) return <p className="text-sm text-red-400">Статус: {err}</p>;
  if (!data) return <p className="text-sm text-slate-500">Загрузка статуса…</p>;
  const status = String(data.status ?? "");
  return (
    <pre className="overflow-auto rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
      {JSON.stringify({ status, progressPct: data.progressPct, error: data.error }, null, 2)}
    </pre>
  );
}
