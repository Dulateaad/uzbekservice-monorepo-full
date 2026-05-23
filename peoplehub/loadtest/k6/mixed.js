import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const fail = new Rate("failed");
const host = __ENV.PH_HOSTING || "https://taxi-eb8b7.web.app";
const api = __ENV.PH_API || "https://api-llyezme3da-uc.a.run.app";
const vus = Number(__ENV.K6_VUS) || 60;

/** Хостинг + /api/health (как смешанный «сайт + бэкенд») */
export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "3m", target: vus },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.05"],
  },
};

export default function () {
  let r = http.get(`${host}/`, { timeout: "30s" });
  fail.add(!check(r, { "host root": (x) => x.status === 200 }));

  r = http.get(`${api}/api/health`, { timeout: "30s" });
  fail.add(!check(r, { "api health": (x) => x.status === 200 }));

  sleep(0.25);
}
