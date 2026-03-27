# Business Hub — Workflow Engine. Архитектура

## Принцип

**Всё строится через одну модель: Operation + Status + Task + Role.**

Голос — это интерфейс. Логика всегда через статусы и операции.  
Если голос напрямую меняет данные — будет хаос.

---

## 1. Роли

| Роль | Назначение |
|------|------------|
| **Manager** (Менеджер) | Создаёт заказ, общается с клиентом, отвечает за оплату |
| **Call Operator** | Подтверждает заказ, фиксирует комментарии клиента |
| **Logistics** (Курьер) | Доставляет, фиксирует статус доставки |
| **Owner** (Владелец) | Видит всю цепочку, аналитика |

---

## 2. Цепочка: Продажа → Доставка → Обратная связь → Допродажа

```
ЭТАП 1: Менеджер создаёт заказ
  → Operation type: sale, status: created
  → assignedTo: Logistics (userId)
  → Task: "Доставить заказ #123" → Logistics

ЭТАП 2: Логистика меняет статус
  → deliveryStatus: delivered | client_refused | not_enough_money | not_available | reschedule
  → Триггеры по статусу (см. ниже)

ЭТАП 3: Менеджер (при отказе)
  → "Перезапустить доставку"
  → Operation type: redelivery, status: reassigned
  → assignedTo: Logistics
  → parentOperationId: id исходной sale
```

---

## 3. Статусы доставки (DeliveryStatus)

| Статус | Описание | Триггер |
|--------|----------|---------|
| `pending` | Ожидает доставки | — |
| `in_progress` | В пути | — |
| `delivered` | Доставлено | Task: закрыть заказ |
| `client_refused` | Клиент отказался | Task Manager: связаться, выяснить причину |
| `not_enough_money` | Нет денег | Task Manager: предложить скидку |
| `not_available` | Клиент недоступен | Task Manager: перезвонить |
| `reschedule` | Перенос | Task Logistics: доставить в новую дату |

---

## 4. Триггеры (Workflow Engine)

| Условие | Действие |
|---------|----------|
| `deliveryStatus = not_enough_money` | Создать Task для Manager: "Связаться с клиентом, предложить скидку" |
| `deliveryStatus = client_refused` | Создать Task для Manager: "Выяснить причину отказа" |
| `deliveryStatus = not_available` | Создать Task для Manager: "Перезвонить клиенту" |
| `deliveryStatus = reschedule` | Создать Task для Logistics: "Доставить в новую дату" |
| `deliveryStatus = delivered` | Закрыть Operation, уведомить Manager |

---

## 5. Голосовой интерфейс

**Не так:** "Скажи что угодно и система поймёт"

**Правильно:**
1. Логист нажимает: 🎤 "Записать статус"
2. Говорит: "Клиент отказался, нет денег"
3. AI преобразует в: `deliveryStatus: not_enough_money`, `comment: "Клиент сказал нет денег"`
4. Если `confidence < 80%` → просит подтвердить

---

## 6. Модели данных

### Operation (расширение)

```
+ deliveryStatus: DeliveryStatus?
+ assignedTo: String?      // userId
+ parentOperationId: String?  // для redelivery
+ deliveryComment: String?
```

### Task

```
id, organizationId, operationId
title, description
assignedTo: userId
status: pending | in_progress | done
triggeredBy: deliveryStatus | manual
createdAt, dueAt
```

### OperationType (дополнение)

```
+ redelivery  // Повторная доставка
```

---

## 7. Firestore коллекции

| Коллекция | Назначение |
|-----------|------------|
| `bh_operations` | Операции (расширены полями workflow) |
| `bh_tasks` | Задачи, созданные триггерами |

---

## 8. Видимость по ролям

| Роль | Видит |
|------|-------|
| Manager | Свои заказы, задачи "связаться с клиентом" |
| Logistics | Только свои доставки, кнопки статусов |
| Owner | Всё: отказы по причинам, потери, конверсия после скидок |

---

## 9. AI (будущее)

- Анализ причин отказов
- Предложение оптимального % скидки
- Вероятность повторной покупки
- Выявление слабых менеджеров

---

## 10. Навигация

```
Business Hub
  ├── Обзор
  ├── Операции (фильтр по assignedTo, deliveryStatus)
  ├── Задачи (новый раздел)
  ├── Контрагенты
  ├── Отчёты
  └── Ещё
```
