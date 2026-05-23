"use client";

/** §3.4 — карточка события: ✓ / ✗, confidence */
export function ValidationCard(props: { confidence?: number; label?: string }) {
  const c = props.confidence ?? 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{props.label ?? "Событие"}</div>
        <div className="text-xs text-slate-500">confidence {(c * 100).toFixed(0)}%</div>
      </div>
      <button type="button" className="rounded bg-emerald-700 px-2 py-1 text-xs" title="Пробел">
        ✓
      </button>
      <button type="button" className="rounded bg-slate-700 px-2 py-1 text-xs" title="Delete">
        ✗
      </button>
    </div>
  );
}
