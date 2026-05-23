/**
 * ~N запросов/с к GET /api/health (без JWT, только Cloud Function + сеть).
 * RPS = rate / timeUnit (см. options).
 *
 * Пример: K6_RPS=500 K6_DURATION=2m k6 run k6/constant-500rps-health.js
 */
import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

const fail = new Rate("failed");
const api = __ENV.PH_API || "https://api-llyezme3da-uc.a.run.app";
const rps = Number(__ENV.K6_RPS) || 500;
const duration = __ENV.K6_DURATION || "2m";

// Для sustained RPS: хватит VU, пока p95*RPS/1000; запас 3–5×
const preVUs = Number(__ENV.K6_PRE_VUS) || Math.max(200, Math.ceil(rps * 0.5));
const capVUs = Number(__ENV.K6_MAX_VUS) || 3000;

export const options = {
  scenarios: {
    rps: {
      executor: "constant-arrival-rate",
      rate: rps,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: preVUs,
      maxVUs: capVUs,
    },
  },
  thresholds: {
    failed: ["rate<0.1"],
  },
  discardResponseBodies: true,
  noConnectionReuse: false,
};

export default function () {
  const r = http.get(`${api}/api/health`, { timeout: "10s" });
  fail.add(!check(r, { h: (x) => x.status === 200 }));
}
