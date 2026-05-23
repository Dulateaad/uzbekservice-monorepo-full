# Нагрузочное тестирование PeopleHub

**Проект:** `peoplehub/` → Firebase **taxi-eb8b7**  
**Важно:** сильный прогон **против прод-URL** = нагрузка на **квоты, счёт Blaze и throttling**. Для «настоящей» суточной модели 100k DAW нужен **отдельный стейджинг-проект** или **очень** умеренные VU и короткое «окно» по согласованию.

## Что именно качаем HTTP-слоем

| Сценарий | Что тестируется | Что **не** покрывается |
|----------|-----------------|------------------------|
| `k6/hosting.js` | Firebase Hosting: `index.html`, `manifest.json` | Firestore/Snapshot из браузера |
| `k6/api-health.js` | Cloud Function `api` — `GET /api/health` | Маршруты с `authMiddleware` (нужен токен) |

Полноценная нагрузка **как у пользователя в мини-апе** = в основом **чтения/записи Firestore**; это не дублирует один только k6 к хостингу. Для Firestore — эмулятор, отдельные скрипты, или k6+заглушка на staging.

## Установка k6

```bash
brew install k6
```

## Переменные (по умолчанию — ваши прод-URL, можно заменить)

| Переменная | Значение по умолчанию |
|------------|------------------------|
| `PH_HOSTING` | `https://taxi-eb8b7.web.app` |
| `PH_API` | `https://api-llyezme3da-uc.a.run.app` (если при деплое сменился URL — возьмите в Firebase Console → Functions → `api`) |

**Короткий путь (ваш путь):**

```bash
cd /Users/dulatea/uzbekservice_app/peoplehub/loadtest
# опционально:
# export PH_API="https://ВАШ-НОВЫЙ-URL.a.run.app"
k6 run k6/hosting.js
k6 run k6/api-health.js
# оба + по очереди:
k6 run k6/mixed.js
```

`K6_VUS` — максимальное VU (по умолчанию в скриптах умеренное, **60**). Пример: `K6_VUS=20 k6 run k6/mixed.js`

## С мини-компьютера

Сначала поднять **локальный** UI и гонять **preview** (опционально):

```bash
cd /Users/dulatea/uzbekservice_app/peoplehub/client
npm run build && npm run preview
# в другом терминале, BASE для preview обычно 4173:
export PH_HOSTING=http://127.0.0.1:4173
k6 run loadtest/k6/hosting.js
```

(запускайте `k6` из `peoplehub/` с путём `loadtest/k6/...` или `cd` в `loadtest` как выше)

---

## «500 активных пользователей в секунду» — важно про формулировки

- **500 одновременно активных (параллельных) «пользователей»** в k6 = **500 VU (virtual users)**. Это *не* обязательно 500 *новых* в секунду, а 500 *потоков*, которые *параллельно* крутят сценарий. Подходящий сценарий: `k6/api-auth-me.js` (по умолчанию разгон до `K6_VUS`, по умолчанию **500**).  
- **500 запросов/с (RPS)** — другая величина. Её делают через `constant-arrival-rate` / `ramping-arrival-rate` в k6, если нужно именно *интенсивность* HTTP, а не *число параллельных*.

Для **реалистичности** между запросами в `api-auth-me.js` стоит `sleep(0.2…1.0) с` — **RPS** будет **ниже**, чем при «ддосе» без пауз. Чем длиннее пауза, тем **меньше** RPS при тех же 500 VU.

## Вариант 3: нагрузка с JWT (как в приложении)

Маршруты ` /api/trips/...` и ` /api/auth/me` требуют `Authorization: Bearer <JWT>`. Скрипт: **`k6/api-auth-me.js`**.

1. **Токены** — файл **`peoplehub/loadtest/tokens.json`** (массив строк), **в git не коммитить** (см. `.gitignore`). Скопируйте `tokens.json.example` → `tokens.json`. Скрипты в `k6/` открывают его как **`../tokens.json`**; при необходимости другой путь: `TOKEN_FILE=/abs/path/tokens.json`.

2. **Сгенерировать JWT** (нужен тот же `JWT_SECRET`, что у Cloud Function — из Secret/`.env` **не** класть в репозиторий). Документ пользователя в **Firestore** `users/<userId>` должен существовать (как в проде/стейдже). Пример (из корня `peoplehub/functions`):

   ```bash
   cd /Users/dulatea/uzbekservice_app/peoplehub/functions
   export JWT_SECRET="(значение из настроек функции / Secret Manager)"
   node ../loadtest/scripts/mint-jwt.cjs tg_ВАSH_ID 12345678 CLIENT
   ```

   Склейте несколько токенов в `tokens.json` (разные `userId` / роли) — **меньше риск «горячей» точки** в Firestore, чем один user на 500 VU.

3. **Прогон 500 VU** (сначала на **стейдже** или **мягко** на проде):

   ```bash
   cd /Users/dulatea/uzbekservice_app/peoplehub/loadtest
   # при необходимости: export PH_API="https://...run.app"
   export K6_VUS=500
   k6 run k6/api-auth-me.js
   ```

4. **Ограничения (реальность, не k6):**  
   - **Cloud Run / Cloud Function** — лимиты **инстансов** и **concurrency** на реплику; 500 VU с частыми вызовами могут дать **throttling/очереди**.  
   - **Счёт Blaze** и **квоты** — следите в консоли.  
   - **Один** JWT на всех — **один** `userId` в Firestore: допустим для *дым-теста*, **не** для картины «как 500 разных людей».

Итог: **да**, вариант 3 (нагрузка **с JWT на API**) можно **настраивать на ~500 одновременных** виртуальных пользователей; «**500 в секунду**» в смысле RPS — **ниже** — сценарии `constant-500rps-*.js`.

---

## ~500 RPS: `constant-arrival-rate` (без sleep)

Исполнитель **`constant-arrival-rate`**: k6 **пытается** запускать `rate` **итераций** за `timeUnit` (по 1 HTTP на итерацию = **~RPS**). Если **не хватает** VU (запросы дольше, чем 1s / rate), k6 **срежет** фактическую скорость — смотрите `dropped_iterations` / лог; увеличьте `K6_PRE_VUS` и `K6_MAX_VUS`.

| Скрипт | Эндпоинт | Токен |
|--------|----------|--------|
| `k6/constant-500rps-health.js` | `GET /api/health` | не нужен |
| `k6/constant-500rps-auth-me.js` | `GET /api/auth/me` | `tokens.json` |

**Переменные**

| Имя | Пример | Смысл |
|-----|--------|--------|
| `K6_RPS` | `500` | Целевой RPS (итер/с) |
| `K6_DURATION` | `2m` | Длительность сценария |
| `K6_PRE_VUS` | `300` | Стартовый пул VU (по умолчанию зависит от скрипта: health ~ max(200, 0.5×RPS), auth/me ~ max(300, 0.6×RPS)) |
| `K6_MAX_VUS` | `3000` | Потолок VU |
| `PH_API` | URL Run | База API |
| `TOKEN_FILE` | путь | Только для `constant-500rps-auth-me.js` / `api-auth-me.js`; по умолчанию `loadtest/tokens.json` |

**Примеры (из `peoplehub/loadtest`):**

```bash
# ~500 RPS только health (проверка сети + CF, без Firestore user read)
K6_RPS=500 K6_DURATION=2m k6 run k6/constant-500rps-health.js

# ~500 RPS с JWT (нагрузка на auth + Firestore read user)
K6_RPS=500 K6_DURATION=1m k6 run k6/constant-500rps-auth-me.js
```

**Важно:** 500 RPS к `/api/auth/me` = **~500 чтений Firestore/с** к коллекции `users` (плюс CPU JWT) — **нагрузка реальная**; **стейджинг** предпочтительнее, чем длительный пик на прод.
