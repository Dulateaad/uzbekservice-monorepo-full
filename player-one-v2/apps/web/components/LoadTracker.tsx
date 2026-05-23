"use client";

/** ТЗ §6.2 — график минут за 7/14/28 дней, порог 300 мин (§4.2). */
export function LoadTracker() {
  const days = [7, 14, 28];
  return (
    <div className="flex flex-wrap gap-4">
      {days.map((d) => (
        <div key={d} className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 min-w-[140px]">
          <div className="text-xs text-slate-500">{d} дней</div>
          <div className="text-lg font-mono text-slate-200">—</div>
          <div className="text-[10px] text-slate-600 mt-1">порог 300 мин / 7д</div>
        </div>
      ))}
    </div>
  );
}
