"""
Locust: GET /health — мок e-PTW (как e-ptw/loadtest/k6/health-stages.js, без ступеней).

Поднимите мок (e-ptw/README.md), затем:

  cd e-ptw/loadtest/locust
  ./run.sh

  BASE_URL=http://127.0.0.1:9099 ./run.sh --headless -u 20 -r 5 -t 1m
"""

from __future__ import annotations

import os

from locust import HttpUser, between, task

_BASE_HOST = os.environ.get("BASE_URL", "http://127.0.0.1:9099").rstrip("/")


class HealthUser(HttpUser):
    host = _BASE_HOST
    wait_time = between(0.4, 0.6)

    @task
    def health(self):
        with self.client.get(
            "/health",
            catch_response=True,
            name="GET /health",
            timeout=30,
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
