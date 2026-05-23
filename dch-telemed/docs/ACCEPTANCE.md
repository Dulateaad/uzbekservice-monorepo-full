# Критерии приёмки MVP (чеклист)

## Функциональность

- [ ] В Firestore создан документ `appointments/{id}` с `type: "online_consultation"`, `doctorId` = UID врача из Firebase Auth, `scheduledStart` / `scheduledEnd` (Timestamp), `patientPhone` (для уведомления).
- [ ] Врач после входа вызывает **Подготовить комнату** — в документе появляется `video.roomName`, `video.roomUrl`.
- [ ] **Подключиться к видео** открывает Daily Prebuilt в iframe с корректным `t=` токеном.
- [ ] Вызов `POST /notify/appointment-link` с заголовком `X-Internal-Key` создаёт `join_grants/{id}` и возвращает `joinUrl` вида `{HOSTING_JOIN_ORIGIN}/?g={grantId}`.
- [ ] Пациент открывает `joinUrl` — загружается видео без знания `appointmentId`.
- [ ] Webhook Daily (события `meeting.started` / `participant.joined` / `meeting.ended`) обновляет `appointments.status` и при необходимости `meetingStartedAt` / `meetingEndedAt`.

## Безопасность

- [ ] В Firestore у клиента нет доступа на чтение `join_grants` и сырых токенов.
- [ ] `DAILY_API_KEY` и `INTERNAL_NOTIFY_KEY` доступны только в Cloud Functions (Secret Manager).
- [ ] Webhook при `ALLOW_INSECURE_WEBHOOK!=1` отклоняет запросы с неверной подписью.

## Нефункциональные требования (из ТЗ)

- **Задержка ≤ 1 с:** в продакшене измеряется отдельно (RTT, выбор регионов Daily, сеть пациента). В MVP зафиксируйте метрики (например задержка RTP на стороне Daily dashboard) и задайте ожидание как *best effort*, не как жёсткий SLA кода DCH.
- **Нагрузочный сценарий:** N параллельных комнат (например 10–20) без деградации Functions; при росте — увеличить `maxInstances`.

## Регрессия после деплоя

1. `GET .../dchApi/health` → 200.
2. Создать запись вручную в Firestore → prepare → token → iframe открывается.
3. Зарегистрировать webhook Daily на URL `.../dchApi/webhooks/daily`, отправить тестовое событие из консоли Daily.
