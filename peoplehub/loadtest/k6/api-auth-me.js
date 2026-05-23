import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { SharedArray } from "k6/data";

const fail = new Rate("failed");
const api = __ENV.PH_API || "https://api-llyezme3da-uc.a.run.app";
const maxVus = Number(__ENV.K6_VUS) || 500;
const tokenFile = __ENV.TOKEN_FILE || "../tokens.json";

const tokens = new SharedArray("jwt pool", function () {
  const raw = open(tokenFile);
  return JSON.parse(raw);
});

if (tokens.length === 0) {
  throw new Error("tokens.json is empty. Copy from tokens.json.example and add JWTs.");
}

/**
 * Сценарий: GET /api/auth/me с Bearer JWT.
 * Rаспределяет токены по VU, чтобы не бить в один userId, если пул > 1.
 * Цель: имитировать «вариант 3» — нагрузка на защищённые маршруты.
 */
export const options = {
  stages: [
    { duration: "1m", target: Math.min(100, maxVus) },
    { duration: "2m", target: maxVus },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    failed: ["rate<0.1"],
    http_req_duration: ["p(95)<10000"],
  },
};

const headers = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  timeout: "30s",
});

export default function () {
  const token = tokens[__VU % tokens.length];
  const r = http.get(`${api}/api/auth/me`, headers(token));
  const ok = check(r, { me: (x) => x.status === 200 });
  fail.add(!ok);
  sleep(0.2 + Math.random() * 0.8);
}
