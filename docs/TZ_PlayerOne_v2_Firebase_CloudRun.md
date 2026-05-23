# Техническое задание (адаптация)

## Интеллектуальное ядро Player One v2.0 — Firebase + Cloud Run

**Базовый документ:** Player One v2.0 (MoCap, тактика, DNA Passport, edge/cloud).  
**Цель адаптации:** зафиксировать ту же продуктовую функциональность на стеке **Firebase** (Auth, Firestore, Storage, Hosting, Functions, FCM) и **Google Cloud Run** (контейнерный FastAPI и при необходимости дополнительные workers), без обязательного Kubernetes и отдельного ЦОД в первой итерации.

**Версия документа:** 1.1  
**Платформа:** Firebase + Cloud Run (GCP)  
**Изменения 1.1:** разделы §8–§9 — `firebase.json` (rewrites на Cloud Run) и таблица URL Hosting ↔ Cloud Run.

---

## 1. Общая архитектура (Firebase + Cloud Run)

| Слой | Технология | Назначение |
|------|------------|------------|
| **Frontend** | Next.js 14 (App Router), **Firebase Hosting** (rewrite на API и статику) | Загрузка видео, дашборды, валидация событий тренером |
| **Middleware / API** | **Cloud Run** — сервис `player-one-api` (FastAPI, HTTPS) | Jobs, MoCap/actions/DNA/risk REST + WebSocket прогресса задач |
| **Очередь и тяжёлый ML** | По этапам: **фон в том же Cloud Run** (BackgroundTasks) → при росте нагрузки **Cloud Tasks** → отдельный **Cloud Run Job** или **Vertex AI** для GPU | Пайплайн анализа видео без обязательного Airflow в v1 |
| **Идентификация** | **Firebase Authentication** + при необходимости Custom Claims (роли athlete / coach / admin) | Bearer JWT к Cloud Run |
| **Данные** | **Firestore** — сессии, jobs, mocap summary, actions, training_log, risk_flags, метаданные DNA | Как в базовом ТЗ по смыслу коллекций |
| **Файлы** | **Firebase Storage** — видео, артефакты рендера, зашифрованные VCF (или только ciphertext в Storage + метаданные в Firestore) | Триггеры через **Cloud Functions** при необходимости |
| **Push** | **FCM** — завершение анализа, красные флаги по риску | Как в §4.2 базового ТЗ |

**Отличие от «полного» ТЗ:** вместо Kubernetes + Airflow + Triton + отдельного PostgreSQL в ЦОД используется управляемый контур GCP/Firebase; требования по **юрисдикции данных** (например, Казахстан) задаются выбором **региона** ресурсов (`region` для Cloud Run, Firestore location при создании проекта, политика Storage) и отдельным юридическим приложением — не дублируются здесь как инженерные имена сервисов.

---

## 2. Модуль MoCap / биомеханика (концептуально без изменений продукта)

- Вход: видео MP4/MOV в **Firebase Storage**.  
- Выход: структурированные данные в **`sessions/{sessionId}/mocap`** (summary, при готовности пайплайна — `frames` с keypoints).  
- Реализация инференса:
  - **v1:** локальный CPU/GPU-пайплайн в контейнере Cloud Run (Ultralytics/MediaPipe и т.д. по мере внедрения), либо гибрид с **Vertex AI** при выносе моделей.  
  - **Опция «быстрый отчёт»:** анализ через **Gemini File API** при наличии ключа (`GEMINI_API_KEY`), без полного MoCap — как отдельный режим `analysis_engine`.

Интеграция с рендером 720p overlay: отдельный **Cloud Run** сервис или очередь **Cloud Tasks** + worker FFmpeg/OpenCV; результат снова в **Storage**, ссылка в Firestore.

---

## 3. Модуль тактики (Action Recognition)

- Результаты: **`sessions/{sessionId}/actions`**, при наличии модели xG — **`sessions/{sessionId}/tactics/xg`**.  
- API: эндпоинты списка действий и PATCH валидации тренером (черновик → подтверждённые события).  
- WebSocket прогресса длинной задачи: на том же Cloud Run (`/jobs/{id}/progress`) или при масштабировании — перенос стриминга в Firebase-backed канал (опционально).

---

## 4. DNA Passport и риски

### 4.1 DNA

- **Минимальный контур на Firebase:** профиль скорингов в **`dna_profiles/{athleteId}`**, аудит загрузок в **`dna_upload_audit`**, без хранения сырого VCF в открытом виде в Firestore.  
- Шифрование: **Fernet** (`DNA_ENCRYPTION_KEY` в Secret Manager / env Cloud Run), файл ciphertext опционально в **Storage**.  
- Полноценный парсинг VCF (Hail) может жить во **втором Cloud Run Job** или внешнем сервисе; контракт API уже может быть `POST /dna/upload`, `GET /dna/{id}/score`.

### 4.2 Injury Risk Engine

- Логика порогов как в базовом ТЗ (перегрузка по **`training_log`**, генетический риск, биомеханика/asymmetry из MoCap summary).  
- Красный флаг: запись в **`athletes/{id}/risk_flags`** + **FCM** тренеру (реализуется Cloud Function или вызов из API при сохранении условий).

---

## 5. DevOps: Firebase + Cloud Run

| Задача | Решение |
|--------|---------|
| Деплой API | `gcloud run deploy` из Dockerfile репозитория `player-one-api`, секреты через **Secret Manager** или переменные окружения |
| Деплой фронта | `firebase deploy --only hosting` для Next.js (SSR через Hosting rewrite или статический экспорт — по выбранной схеме) |
| Триггер после загрузки видео | **Cloud Functions** `onFinalize` Storage → HTTP POST **`POST /jobs/create`** или внутренний URL Cloud Run с проверкой секрета |
| Лимиты и стоимость | Таймауты Cloud Run, max instances, размер видео (как `MAX_VIDEO_SIZE_MB`) |
| Наблюдаемость | Cloud Logging / Error Reporting для сервиса Cloud Run |

---

## 6. API (контракт с базовым ТЗ §7)

Сохраняются те же группы эндпоинтов (Jobs, MoCap, Actions, DNA, Risk), базовый URL — **HTTPS Cloud Run**. Авторизация: **Firebase ID Token** в заголовке `Authorization: Bearer`.

Примеры путей на одном сервисе:

- `POST /jobs/create`  
- `GET /jobs/{job_id}`  
- `GET /ws`-совместимый поток: `WebSocket /jobs/{job_id}/progress?token=…`  
- `GET /mocap/{session_id}`, `/forces`, `/summary`, `POST …/render`  
- `GET /actions/{session_id}`, `PATCH /actions/{action_id}?session_id=…`  
- `POST /dna/upload`, `GET /dna/{athlete_id}/score`  
- `GET /risk/{athlete_id}/current`, `/flags`, `/load`

Legacy-маршруты приложения (`/api/analyze-video`, `/api/analyze-video-storage`) остаются для совместимости с текущим клиентом. Прокси через Hosting описан в **§8–§9**.

---

## 7. Переменные окружения (Cloud Run)

Обязательные/типовые:

- `FIREBASE_PROJECT_ID`, учётные данные сервисного аккаунта (Firestore/Storage).  
- `GEMINI_API_KEY`, `GEMINI_MODEL` — опционально для режима Gemini.  
- `DEFAULT_ANALYSIS_ENGINE` — `auto` | `gemini` | `local`.  
- `CORS_ORIGINS` — origin фронта (Hosting + localhost).  
- `DNA_ENCRYPTION_KEY` — для шифрования загрузок DNA (опционально в prod).  
- Секреты TTL видео / интеграции — как в существующем `player-one-api`.

---

## 8. Firebase Hosting и `firebase.json`

Хостинг (Next.js/Web) раздаёт статику из каталога сборки (`out`, `dist`, либо артефакт **`firebase-frameworks`** для SSR). Запросы к API **проксируются на Cloud Run** через `rewrites`, чтобы приложение могло вызывать бэкенд с **того же origin** (`https://<project>.web.app`) и упрощать CORS для REST.

Пример фрагмента `firebase.json` (подставьте свой **`serviceId`** и **`region`**, как в консоли Cloud Run):

```json
{
  "hosting": {
    "public": "apps/web/out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "/jobs/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "/mocap/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "/actions/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "/dna/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "/risk/**",
        "run": {
          "serviceId": "player-one-api",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          { "key": "Cache-Control", "value": "public,max-age=31536000,immutable" }
        ]
      }
    ]
  }
}
```

**Замечания:**

- **`run.serviceId` и `region`** должны совпадать с развёрнутым сервисом в GCP. Удобно держать имя сервиса в документации проекта рядом с URL вида `https://player-one-api-xxxxx-uc.a.run.app`.
- Маршруты **v2** в текущем FastAPI смонтированы **без** префикса `/api` (`/jobs`, `/mocap`, `/actions`, `/dna`, `/risk`) — для них нужны отдельные `rewrites`, как в примере, либо один общий префикс после рефакторинга API.
- Legacy-эндпоинты вида **`/api/analyze-video`** попадают под правило **`/api/**`**.
- **Next.js SSR:** если приложение само крутится на Cloud Run (`firebase-frameworks` / отдельный сервис), структура `hosting` и каталог `public` отличаются от статического экспорта — правила `rewrites` остаются принципиально теми же для второго сервиса API.
- **WebSocket:** проксирование `wss` через Firebase Hosting на Cloud Run **зависит от конфигурации и региона**; при проблемах с `WebSocket /jobs/.../progress` клиент использует **прямой URL Cloud Run** (см. §9).

---

## 9. Таблица соответствия URL (Hosting ↔ Cloud Run)

**Прямой базовый URL Cloud Run** (пример формата):  
`https://player-one-api-XXXXXXXXXX-us-central1.a.run.app`

| Назначение | Путь на сервисе Cloud Run | Через Hosting (если настроены rewrites из §8) |
|------------|---------------------------|-----------------------------------------------|
| Проверка живости | `GET /`, `GET /api/health` | `GET https://<site>/api/health` |
| Swagger / OpenAPI | `GET /docs`, `GET /openapi.json` | Обычно только прямой Run или ограничить по IP / VPN |
| Legacy: загрузка / статус | `POST /api/analyze-video`, `POST /api/analyze-video-storage`, `GET /api/analysis-status/{job_id}` | Тот же путь под доменом сайта при rewrite `/api/**` |
| Jobs (ТЗ v2) | `POST /jobs/create`, `GET /jobs/{job_id}` | `https://<site>/jobs/...` при rewrite `/jobs/**` |
| Прогресс (WS) | `WebSocket wss://<run-host>/jobs/{job_id}/progress?token=<JWT>` | При необходимости **только прямой Run** — см. §8 |
| MoCap | `GET /mocap/{session_id}`, `.../forces`, `.../summary`, `POST .../render` | При rewrite `/mocap/**` |
| Actions | `GET /actions/{session_id}`, `PATCH /actions/{action_id}?session_id=` | При rewrite `/actions/**` |
| DNA | `POST /dna/upload`, `GET /dna/{athlete_id}/score`, `.../recommendations` | При rewrite `/dna/**` |
| Risk | `GET /risk/{athlete_id}/current`, `.../flags`, `.../load` | При rewrite `/risk/**` |

**Фронтенд:** переменная **`NEXT_PUBLIC_PLAYER_ONE_API_URL`** — для REST указывайте либо origin Hosting (если все нужные префиксы проксируются на Run), либо **прямой URL Cloud Run** (удобно для отладки и для WebSocket).

---

## 10. Структура репозитория (рекомендация под Firebase + Cloud Run)

```
apps/web/                 # Next.js → Firebase Hosting
services/player-one-api/  # FastAPI → Cloud Run (или имя каталога как в вашем репо)
functions/                # Firebase Functions — триггеры Storage, FCM helpers
docs/
  TZ_PlayerOne_v2_Firebase_CloudRun.md   # этот документ
```

---

## 11. Definition of Done (сокращённо под Firebase + Cloud Run)

1. Видео загружается в Storage; задача анализа создаётся и доходит до статуса **completed** или **failed** с записью в Firestore.  
2. Режимы **`auto` / `gemini` / `local`** работают согласно конфигурации.  
3. Для сессии доступны чтение **mocap summary** и **actions** через API.  
4. Risk API возвращает согласованный уровень **green/yellow/red** при наличии данных в коллекциях.  
5. Hosting отдаёт фронт; CORS и авторизация к Cloud Run проверены с продакшн-origin.

Полные метрики базового ТЗ (OptiTrack < 5°, 60 мин за 10 мин GPU, edge > 24 FPS) остаются **целевыми** для команды ML и масштабирования Cloud Run / GPU — не блокируют приёмку «архитектуры Firebase + Cloud Run».

---

## 12. Глоссарий

Термины совпадают с базовым ТЗ (MoCap, GRF, SNP, xG, ТТД и т.д.). Дополнительно:

- **Cloud Run** — управляемые контейнеры с HTTPS и авто-масштабированием.  
- **Firebase Hosting** — CDN и конфигурация rewrites на Cloud Run и статику.
