/**
 * Базовый URL API: прямой Cloud Run или пустая строка = тот же origin (Hosting → rewrite на Run).
 */
export function playerOneApiBase(): string {
  const u = process.env.NEXT_PUBLIC_PLAYER_ONE_API_URL?.trim();
  return u ? u.replace(/\/$/, "") : "";
}

export function buildApiUrl(path: string): string {
  const base = typeof window !== "undefined" ? playerOneApiBase() : playerOneApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetchJson<T>(
  path: string,
  init: RequestInit & { token?: string | null }
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const tok = init.token;
  if (tok) headers.set("Authorization", `Bearer ${tok}`);
  const url = buildApiUrl(path);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

export async function postAnalyzeVideoStorage(
  body: Record<string, unknown>,
  token: string
): Promise<{ jobId: string; status: string; message?: string }> {
  return apiFetchJson("/api/analyze-video-storage", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function getAnalysisJob(jobId: string, token: string) {
  return apiFetchJson<Record<string, unknown>>(`/api/analysis-status/${jobId}`, {
    method: "GET",
    token,
  });
}

/** WebSocket прогресса — только на прямой Cloud Run (см. ТЗ §8). */
export function jobProgressWebSocketUrl(jobId: string, idToken: string): string | null {
  const base = playerOneApiBase();
  if (!base || !base.includes("run.app")) return null;
  const u = base.replace(/^http/, "ws");
  return `${u}/jobs/${jobId}/progress?token=${encodeURIComponent(idToken)}`;
}
