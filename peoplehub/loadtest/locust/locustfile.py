"""
Locust: GET /api/health — аналог peoplehub/loadtest/k6/api-health.js (без ступеней:
в Locust 2.x --run-time не ограничивает LoadTestShape; ступени — в k6).

Установка:
  cd peoplehub/loadtest/locust
  ./run.sh

Запуск с веб-UI:
  PH_API=https://your-api-xxxxx-uc.a.run.app ./run.sh
  Откройте http://localhost:8089, задайте Users / Spawn rate, Start.

Headless:
  PH_API=https://your-api-xxxxx-uc.a.run.app \\
    ./run.sh --headless -u 60 -r 10 -t 3m

Переменные:
  PH_API — базовый URL без завершающего /. Только реальный хост Cloud Run.
"""

from __future__ import annotations

import os

from locust import HttpUser, between, task

_API_HOST = os.environ.get("PH_API", "https://api-llyezme3da-uc.a.run.app").rstrip("/")


class ApiHealthUser(HttpUser):
    host = _API_HOST
    wait_time = between(0.12, 0.22)

    @task
    def health(self):
        with self.client.get(
            "/api/health",
            catch_response=True,
            name="GET /api/health",
            timeout=30,
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
