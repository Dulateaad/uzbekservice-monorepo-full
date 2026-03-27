# Realtime Database rules (pilot)

Файл [`database.rules.json`](database.rules.json) открывает чтение/запись для `users/{deviceId}/telemetry` и `rr_history`, чтобы **ESP32 с legacy database secret** и **веб-клиент** могли работать без настройки Firebase Auth на устройстве.

**Перед продакшеном** замените правила на модель с секретом устройства, Firebase App Check или записью телеметрии только через HTTPS Cloud Function.

Включите Realtime Database в консоли Firebase проекта **anama-app**, затем выполните:

`firebase deploy --only database --project anama-app`
