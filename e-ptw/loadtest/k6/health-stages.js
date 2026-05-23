import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const failRate = new Rate("failed");
const base = __ENV.BASE_URL || "http://127.0.0.1:9099";
const vus = Number(__ENV.K6_VUS) || 200;

/** Только GET /health — быстрый smoke + «ступенчатая» нагрузка. */
export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 30 },
    { duration: "2m", target: Math.min(vus, 100) },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const r = http.get(`${base}/health`, { timeout: "30s" });
  const ok = check(r, { health: (x) => x.status === 200 });
  failRate.add(!ok);
  sleep(0.5);
}
