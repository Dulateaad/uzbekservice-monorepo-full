/**
 * Разрешённые Origin для CORS (production: подставьте URL Firebase Hosting).
 */
export const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

/** Базовый URL join-приложения для ссылок в сообщениях (пример). */
export function joinUrlBaseFromRequest(hostingJoinOrigin: string): string {
  return hostingJoinOrigin.replace(/\/$/, "");
}
