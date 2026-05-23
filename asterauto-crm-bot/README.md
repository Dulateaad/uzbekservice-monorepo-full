# asterauto-crm-bot

Telegram CRM-бот для **Aster Auto**: лиды, менеджеры, АТЗ, РОП, SLA, передачи, опросы покупателя. Данные в **PostgreSQL** (VPS или любой доступный хост).

## Стек

Node 18+, TypeScript, **Telegraf**, **pg**.

## Быстрый старт

```bash
cp .env.example .env
# Заполните DATABASE_URL, TELEGRAM_BOT_TOKEN, BOT_ADMIN_IDS (см. ниже)

npm install
npm run db:migrate   # применить sql/schema.sql
npm run build
npm start
```

Локально: `npm run dev`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `TELEGRAM_BOT_TOKEN` | От @BotFather |
| `BOT_ADMIN_IDS` | Telegram user id через запятую; также `/addadmin` выдаёт роль admin в БД |
| `ROP_TELEGRAM_IDS` | РОП — уведомления SLA ~30 мин (опционально) |
| `SLA_REMINDER_MINUTES`, `SLA_ROP_MINUTES` | По умолчанию 15 / 30 |
| `CUSTOMER_SURVEY_MINUTES` | Опрос покупателя после заявки из Telegram |
| `BOT_POLLER_INTERVAL_MS`, `BOT_DISABLE_BACKGROUND_POLL` | Нагрузка / отключить фоновые опросы |
| `BOT_WEBHOOK_SECRET`, `BOT_WEBHOOK_PUBLIC_URL` | Если бот по webhook |

## Основное

- **Назначение лидов по бренду:** у менеджера в профиле поле **`brands`**. Если у менеджера брендов нет — он в пуле «на все марки». Узкие бренды (OMODA, Jetour…) задавайте в `/adduser` или `/editmgr`.
- **`/addadmin`** — текущий админ назначает другого админа (запись в БД).
- **РОП:** сводки по отделу (`/setdept`), **«📤 Все передачи»** по компании, **«🔄 Передачи отдела»** только отдел.
- **Админ:** `/broadcast_clients` — рассылка всем клиентам из `ltb_buyer_contacts`; `/broadcast` — сотрудникам.

## VPS

```bash
# Node 20 (пример через NodeSource), PostgreSQL на сервере
cd asterauto-crm-bot
npm install && npm run db:migrate && npm run build
pm2 start dist/index.js --name asterauto-bot --cwd "$PWD"
pm2 save
pm2 startup systemd   # выполните выводимую строку sudo …
```

## Устарело (Firebase)

Если нужен исторический фрагмент правил для веба и Firestore: [`docs/firestore-ltb.fragment.rules`](docs/firestore-ltb.fragment.rules). Текущий бот использует только PostgreSQL.

## Лицензия

Приватный проект Aster Auto — по согласованию с владельцем.
