import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const fail = new Rate("failed");
const base = __ENV.PH_HOSTING || "https://taxi-eb8b7.web.app";
const vus = Number(__ENV.K6_VUS) || 60;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: Math.min(vus, 40) },
    { duration: "2m", target: vus },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
  },
};

export default function () {
  const paths = ["/", "/index.html", "/manifest.json"];
  for (const p of paths) {
    const r = http.get(`${base}${p}`, { timeout: "30s" });
    const ok = check(r, { [p]: (x) => x.status === 200 || x.status === 304 });
    fail.add(!ok);
  }
  sleep(0.2 + Math.random() * 0.4);
}
