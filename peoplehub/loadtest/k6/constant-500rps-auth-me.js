/**
 * ~N RPS с JWT: GET /api/auth/me (1 запрос = 1 итерация = 1 RPS).
 * Крутит токен по `idInTest` (каждому VU — свой сдвиг в пуле).
 *
 * K6_RPS=500 K6_DURATION=1m k6 run k6/constant-500rps-auth-me.js
 */
import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
import execution from "k6/execution";

const err = new Rate("errors");
const api = __ENV.PH_API || "https://api-llyezme3da-uc.a.run.app";
const rps = Number(__ENV.K6_RPS) || 500;
const duration = __ENV.K6_DURATION || "1m";
const tokenFile = __ENV.TOKEN_FILE || "../tokens.json";
const preVUs = Number(__ENV.K6_PRE_VUS) || Math.max(300, Math.ceil(rps * 0.6));
const capVUs = Number(__ENV.K6_MAX_VUS) || 3000;

const tokens = new SharedArray("t", function () {
  return JSON.parse(open(tokenFile));
});

if (!tokens.length) {
  throw new Error("Создайте loadtest/tokens.json с массивом JWT");
}

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
  thresholds: { errors: ["rate<0.2"] },
  discardResponseBodies: true,
};

export default function () {
  const idx = Number(execution.vu.idInTest) % tokens.length;
  const token = tokens[idx];
  const r = http.get(`${api}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: "15s",
  });
  err.add(!check(r, { me: (x) => x.status === 200 }));
}
