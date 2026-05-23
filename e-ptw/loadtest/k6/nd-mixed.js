import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const failRate = new Rate("failed");
const base = __ENV.BASE_URL || "http://127.0.0.1:9099";
const vus = Number(__ENV.K6_VUS) || 200;

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "2m", target: Math.min(vus, 80) },
    { duration: "8m", target: vus },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

/**
 * Смешанный сценарий: health + список + «создание» + «согласование».
 * Под мок e-ptw/mock-server; для staging — те же пути, если BFF повторяет.
 */
export default function () {
  // health
  let r = http.get(`${base}/health`, { timeout: "30s" });
  let ok = check(r, { health: (x) => x.status === 200 });
  failRate.add(!ok);

  r = http.get(`${base}/api/v1/permits`, { timeout: "30s" });
  ok = check(r, { list: (x) => x.status === 200 });
  failRate.add(!ok);

  r = http.post(
    `${base}/api/v1/permits`,
    JSON.stringify({ title: "load test", workType: "hot" }),
    { headers: { "Content-Type": "application/json" }, timeout: "30s" }
  );
  ok = check(r, { create: (x) => x.status === 201 });
  failRate.add(!ok);

  r = http.post(`${base}/api/v1/permits/m1/approve`, "{}", {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  });
  ok = check(r, { approve: (x) => x.status === 200 });
  failRate.add(!ok);

  sleep(0.2 + Math.random() * 0.5);
}
