# 🚖 PeopleHub — Telegram Mini App для заказа такси

**Платформа взаимного уважения, где честность выгодна, пунктуальность поощряется, грубость наказывается автоматически.**

## Ключевые особенности

- **100% предоплата** — защита водителя от неплательщиков
- **0% комиссии** — вся оплата идёт водителю (абонентка 200 тг/день)
- **TrustScore** — автоматическая система уважения (рейтинг 1.0–5.0)
- **GPS-антифрод** — автоматическая защита от мошенничества
- **Без звонков** — только чат с быстрыми шаблонами

## Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| База данных | PostgreSQL + Prisma ORM |
| Кеш/Сессии | Redis |
| Real-time | Socket.io (WebSocket) |
| Карты | Mapbox GL |
| Telegram | WebApp API |
| Контейнеры | Docker + Docker Compose |

## Структура проекта

```
peoplehub/
├── client/                 # React Telegram Mini App
│   ├── src/
│   │   ├── components/     # UI компоненты
│   │   ├── hooks/          # React hooks (useTelegram, etc.)
│   │   ├── pages/          # Страницы (Auth, Client, Driver, Trip, Chat)
│   │   ├── services/       # API клиент, Socket.io
│   │   ├── store/          # Zustand state management
│   │   ├── styles/         # Tailwind + кастомные стили
│   │   └── types/          # TypeScript типы
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Node.js API
│   ├── src/
│   │   ├── config/         # Конфигурация, БД, Redis, логгер
│   │   ├── middleware/      # Auth, Error handling
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Бизнес-логика
│   │   ├── utils/           # Геолокация, ценообразование, Telegram
│   │   └── websocket/       # Real-time события
│   ├── prisma/
│   │   ├── schema.prisma   # Схема БД (12 моделей)
│   │   └── seed.ts         # Тестовые данные
│   └── package.json
├── docker-compose.yml      # PostgreSQL + Redis + Server + Client
└── README.md
```

## Быстрый старт

### Вариант 1: Docker (рекомендуется)

```bash
# Запустить все сервисы
docker-compose up -d

# Применить миграции
docker-compose exec server npx prisma migrate deploy

# Наполнить тестовыми данными
docker-compose exec server npx prisma db seed
```

Приложение будет доступно на http://localhost

### Вариант 2: Локальная разработка

**Предварительные требования:** Node.js 20+, PostgreSQL 16+, Redis 7+

```bash
# 1. Установить зависимости
cd peoplehub
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Запустить PostgreSQL и Redis (Docker)
docker-compose up -d postgres redis

# 3. Настроить окружение
cp server/.env.example server/.env
# Отредактировать server/.env — указать TELEGRAM_BOT_TOKEN

# 4. Применить миграции и seed
cd server
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 5. Запустить dev-серверы
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Prisma Studio:** `cd server && npx prisma studio` (http://localhost:5555)

## API Endpoints

### Auth
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/telegram` | Авторизация через Telegram |
| POST | `/api/auth/register` | Завершение регистрации |
| GET | `/api/auth/me` | Текущий пользователь |

### Trips
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/trips` | Создать заказ |
| GET | `/api/trips/price` | Расчёт цены |
| GET | `/api/trips/active` | Активная поездка |
| GET | `/api/trips/history` | История поездок |
| PATCH | `/api/trips/:id/status` | Обновить статус |
| POST | `/api/trips/:id/rate` | Оценить поездку |
| POST | `/api/trips/:id/no-show` | Клиент не вышел |

### Driver
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/driver/go-online` | Выйти на линию |
| POST | `/api/driver/go-offline` | Уйти с линии |
| POST | `/api/driver/location` | GPS-координаты |
| POST | `/api/driver/subscribe` | Активировать абонентку |
| GET | `/api/driver/stats` | Статистика |
| GET | `/api/driver/profile` | Профиль водителя |

### Chat
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/chat/templates` | Шаблоны сообщений |
| GET | `/api/chat/:tripId` | История чата |
| POST | `/api/chat/:tripId` | Отправить сообщение |

## WebSocket Events

| Событие | Направление | Описание |
|---------|------------|----------|
| `trip:status_update` | Server → Client | Обновление статуса поездки |
| `driver:location` | Driver → Server | GPS-координаты водителя |
| `driver:location:update` | Server → Client | Позиция водителя для клиента |
| `chat:message` | Client → Server | Новое сообщение |
| `chat:new_message` | Server → Client | Входящее сообщение |
| `chat:typing` | Bidirectional | Индикатор набора |

## FSM Статусов поездки

```
SEARCHING → DRIVER_ASSIGNED → DRIVER_ARRIVING → DRIVER_ARRIVED
    ↓            ↓                 ↓                 ↓
 NO_DRIVER    CANCELLED        CANCELLED         WAITING_PAYMENT
                                                      ↓
                                                     PAID
                                                      ↓
                                                  IN_PROGRESS
                                                      ↓
                                                   COMPLETED
```

## GPS-антифрод

| Событие | Условия валидации |
|---------|-------------------|
| ARRIVED (На месте) | Радиус ≤ 120м, удержание ≥ 20 сек, скорость ≤ 8 км/ч |
| START TRIP (Поехали) | После оплаты, радиус ≤ 200м, ≤ 15 мин после оплаты |
| WAIT TIMER | Радиус ≤ 120м, скорость ≤ 8 км/ч |
| NO_SHOW (Не вышел) | ≥ 10 мин ожидания, 80%+ точек в геозоне |

## TrustScore

| Фактор | Дельта |
|--------|--------|
| Оценка 5★ | +0.01 |
| 30 дней без нарушений | +0.05 |
| Пунктуальность | +0.03 |
| Оценка 1★ | -0.05 |
| Отмена (клиент) | -0.10 |
| Отмена (водитель) | -0.15 |
| Не вышел | -0.20 |
| Грубость в чате | -0.15 |
| GPS-фрод | -0.60 + блокировка |

## Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите Bot Token
3. Настройте Web App URL в BotFather: `/newapp`
4. Укажите Token в `server/.env` → `TELEGRAM_BOT_TOKEN`

## Лицензия

Proprietary — PeopleHub © 2026
