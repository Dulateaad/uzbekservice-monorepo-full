"use client";

/** ТЗ §6.2 — баннер при активных risk flags (данные из GET /risk/:id/current). */
export function RiskFlagBanner() {
  return (
    <div
      role="status"
      className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100"
    >
      <strong className="font-medium">RiskFlagBanner</strong>
      <span className="text-red-200/80">
        {" "}
        — подключите GET <code className="text-red-300">/risk/&#123;athlete_id&#125;/current</code>.
      </span>
    </div>
  );
}
