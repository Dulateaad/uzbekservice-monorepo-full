import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const fail = new Rate("failed");
const api = __ENV.PH_API || "https://api-llyezme3da-uc.a.run.app";
const vus = Number(__ENV.K6_VUS) || 60;

/**
 * Публичный health Cloud Function (без токена).
 * Переопределите PH_API, если в консоли другой URL.
 */
export const options = {
  stages: [
    { duration: "20s", target: 5 },
    { duration: "1m", target: 30 },
    { duration: "2m", target: vus },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.05"],
    http_req_duration: ["p(95)<8000"],
  },
};

export default function () {
  const r = http.get(`${api}/api/health`, { timeout: "30s" });
  const ok = check(r, { health: (x) => x.status === 200 });
  fail.add(!ok);
  sleep(0.15);
}
