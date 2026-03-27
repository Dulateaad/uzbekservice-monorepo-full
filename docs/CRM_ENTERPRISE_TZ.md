# CRM Enterprise — техническое задание (поэтапная реализация)

Документ объединяет требования к CRM уровня крупного бизнеса и связки с **Business Hub**: операции, контрагенты, задачи BH, **Work**, дашборд, уведомления.

**Соглашения в коде:** поля в Firestore — `camelCase` (как сейчас в `bh_leads`, `bh_deals`). В ТЗ ниже для ясности указаны имена в стиле БД; в реализации — те же имена, что в Dart-моделях.

---

## 1. Архитектура (ядро сущностей)

| Сущность | Назначение | Коллекция (предложение) |
|----------|------------|-------------------------|
| Lead | Входящий интерес | `bh_leads` (есть) |
| Company | Юр./коммерческая структура | `bh_companies` (новая) |
| Contact | Лицо внутри компании | `bh_contacts` (новая) |
| Deal | Сделка в воронке | `bh_deals` (есть, расширить) |
| DealItem | Строки сделки (продукт × кол-во × цена) | `bh_deal_items` (новая) |
| Activity | Звонок, встреча, email, заметка | `bh_activities` (есть) |
| CRM Task | Задача с дедлайном по сделке/лиду | `bh_crm_tasks` (новая; не путать с `bh_tasks` от доставки) |
| Pipeline | Воронка + набор стадий | `bh_pipelines` (новая) или поле в org |
| Product | Каталог для строк сделки | `bh_products` (новая) |
| Subscription | Подписка после сделки | `bh_subscriptions` (новая) |

**Связи (целевые):**

```
Lead ──► Contact ──► Company
Lead ──► Deal
Deal ──► Activities, CRM Tasks, Operation, Work, Subscription, Documents
Deal ──► DealItems ──► Product
Deal.pipelineId + stage ──► стадия в конкретной воронке
```

**Контрагенты:** `Deal.companyId` в ТЗ = связь с компанией CRM; для финансов сохранить связь с **`bh_counterparties`** (`counterpartyId`): при конвертации компании в контрагента или явном маппинге `companyId → counterpartyId`.

---

## 2. Модели данных (поля)

### 2.1 Leads — `bh_leads`

| Поле | Тип | Статус в коде |
|------|-----|----------------|
| id, organizationId | string | есть |
| name, phone, email | string? | есть |
| companyName / company | string? | есть как `company` |
| source | enum + опционально campaign, utm | частично: есть `BHLeadSource`, нет campaign/utm |
| status | enum | есть `BHLeadStatus` |
| ownerId | string? | сейчас `assignedTo` — унифицировать название в UI/аналитике как owner |
| notes | string? | есть |
| contactId, companyId | string? | **добавить** (связь Lead → Contact / Company) |
| createdAt, updatedAt | timestamp | есть |

### 2.2 Companies — `bh_companies` (новая)

- id, organizationId, name, industry?, size?, address?, website?, ownerId?, counterpartyId? (ссылка на `bh_counterparties` при синхронизации)
- createdAt, updatedAt

### 2.3 Contacts — `bh_contacts` (новая)

- id, organizationId, name, phone?, email?, companyId, position?, ownerId?
- createdAt, updatedAt

### 2.4 Deals — `bh_deals` (расширение)

| Поле | Описание | Статус |
|------|----------|--------|
| title, amount, currency, stage | базовые | есть |
| organizationId | | есть |
| leadId | | есть |
| counterpartyId / counterpartyName | контрагент BH | есть |
| companyId, contactId | CRM | **добавить** |
| pipelineId | воронка | **добавить** (до внедрения — дефолтная «Sales») |
| ownerId | ответственный | расширить: сейчас `assignedTo` |
| probability | 0–100 | **добавить** |
| priority | low / medium / high / urgent | **добавить** |
| dealType | new, repeat, subscription, partnership, advertising | **добавить** |
| nextAction, nextActionDate, nextActionDone | следующее действие | **добавить** |
| lostReason | enum из п.13 | **добавить** при stage=lost |
| operationId | связь с операцией | **добавить** (сейчас операция создаётся с `dealId` на стороне операции — дублировать обратную ссылку в сделке) |
| workId | связь с Work | **добавить** |
| subscriptionId | | **добавить** |
| expectedCloseDate, notes | | есть частично |
| createdAt, updatedAt | | есть |

### 2.5 Deal items — `bh_deal_items`

- id, dealId, productId, qty, price, total (можно считать на клиенте), organizationId (денормализация для правил)

### 2.6 Activities — `bh_activities`

- id, organizationId, dealId?, leadId?, type, subject, description?, date (`activityDate`), createdBy
- **status** (planned / done) — **добавить** при необходимости закрытия next action
- Тип `task` в ТЗ: либо отдельная сущность CRM Task, либо не дублировать — рекомендация: **активности без task**; задачи только в `bh_crm_tasks`

### 2.7 CRM Tasks — `bh_crm_tasks`

- id, organizationId, dealId?, leadId?, title, assignedTo, dueDate, status (pending / inProgress / done), priority?, createdAt, updatedAt, createdBy?

**Отличие от `bh_tasks`:** текущие BH Task привязаны к `operationId` и доставке — не смешивать коллекции.

### 2.8 Pipelines — `bh_pipelines`

- id, organizationId, name (Sales, Partnership, …), stages: массив `{ id, name, order }` или фиксированный enum + кастомные названия
- Стадии по ТЗ: New, Qualification, Proposal, Negotiation, Won, Lost — маппинг на текущий `BHDealStage`

### 2.9 Products — `bh_products`

- id, organizationId, name, price, currency?, type? (товар / услуга), active, createdAt, updatedAt

### 2.10 Subscriptions — `bh_subscriptions`

- id, organizationId, dealId, plan, price, startDate, endDate, status, autoRenew, createdAt, updatedAt

---

## 3. Воронки (Pipelines)

- Несколько воронок на организацию; у сделки `pipelineId`.
- Стадии согласованы с текущими этапами сделки; при нескольких воронках — один и тот же набор стадий или кастом (этап 4 — гибкость).

---

## 4. CRM → Операции

**Триггер:** `stage == won`.

- Уже реализовано: автосоздание операции дохода при переводе в «Выиграна» (с `dealId` на операции).
- По ТЗ дополнительно:
  - Явная кнопка **«Создать операцию»** если авто не сработало (сумма 0, отмена и т.д.).
  - После создания: **`deal.operationId`** = id операции; `source: CRM` в метаданных/примечании операции.
  - counterparty: `deal.counterpartyId` или привязка через `companyId` → counterparty.

---

## 5. CRM → Work

**Триггер:** после выигрыша сделки — кнопка **«Создать заказ»**.

- Создать `Work`: `type = order`, в `metadata` (или отдельное поле после миграции) **`crmDealId`**, organizationId, assignedTo = owner, title/description из сделки.
- Обновить **`deal.workId`**.

---

## 6. CRM → Подписки

Если `dealType == subscription` при Won (или отдельная кнопка):

- Создать запись в `bh_subscriptions`; проставить **`deal.subscriptionId`**.

---

## 7. Следующие действия и просрочка

- Поля на сделке: `nextAction`, `nextActionDate`, `nextActionDone`, `priority`.
- **Просрочка:** `nextActionDate < now && !nextActionDone` — бейдж в списках/канбане, фильтр «Просрочено», запросы в Firestore (индекс по `organizationId` + `nextActionDate`).

---

## 8. Активности

- Типы: call, meeting, email, note (есть).
- При сохранении активности — чекбокс **«Закрыть следующее действие»** → `nextActionDone = true` (и опционально очистить nextAction).

---

## 9. Автоматизации (этап 4)

| Правило | Действие |
|---------|----------|
| Новый лид | Создать `bh_crm_tasks`: «Позвонить» |
| Стадия Proposal | Задача «Отправить КП» |
| Стадия Won | Предложить операцию (если ещё нет `operationId`) |
| Нет активности по сделке 3 дня | Уведомление (in-app / FCM) |
| Просрочено nextAction | Push |

Реализация: Cloud Functions по расписанию + триггеры onCreate/onUpdate документов, либо клиентские напоминания на первом этапе.

---

## 10. Дашборд CRM

Метрики (за период, по organizationId):

- Лиды, сделки всего, Won / Lost, сумма продаж, средний чек, конверсия, прогноз (сумма активной воронки × вероятность — опционально).

Частично пересекается с `getDashboardStats` — вынести агрегации в сервис `bh_crm_analytics_service` или расширить существующий.

---

## 11. KPI менеджеров

Отчёт по `ownerId` / `assignedTo`: лиды, сделки, won, сумма, конверсия. Экспорт CSV позже.

---

## 12. Источники лидов

- Расширить лид: `source` (уже есть), **`campaign`**, **`utmSource`**, **`utmMedium`**, **`utmCampaign`** (строки, опционально).

---

## 13. Причины проигрыша (Lost)

Enum/справочник: `tooExpensive`, `noBudget`, `competitor`, `noResponse`, `notRelevant`, `other` + текст.

---

## 14–15. Приоритет и тип сделки

- **Priority:** Low, Medium, High, Urgent.
- **Deal type:** new, repeat, subscription, partnership, advertising.

---

## 16. Связь с контрагентами

- `Deal.companyId` — CRM-компания; при оплате/учёте — **`counterpartyId`** на `bh_counterparties`.
- Рекомендация: на карточке компании кнопка «Создать / привязать контрагента».

---

## 17. Уведомления

События: новый лид, новая сделка, просрочка, выиграна сделка, назначена задача.  
Каналы: FCM + коллекция `bh_notifications` или существующий механизм приложения.

---

## 18. Итоговая воронка (логика продукта)

```
Lead → Contact / Company → Deal → Next action → Activities
→ Won → Operation → Work → Subscription → Аналитика
```

---

## 19. Минимальный порядок реализации (roadmap)

### Этап 1 — база процесса продаж

1. Поля сделки: `nextAction`, `nextActionDate`, `nextActionDone`, `priority`, унификация **owner** (`assignedTo` / `ownerId` в модели и UI).
2. UI: просроченные сделки (фильтр + подсветка).
3. Активность: чекбокс «закрыть следующее действие».

**Критерий готовности:** менеджер видит SLA по сделкам без Excel.

### Этап 2 — деньги и исполнение

1. Won → операция: довести до ТЗ (`deal.operationId`, кнопка ручного создания, `source: CRM`).
2. Won → **Work** (`order`, `crmDealId` в metadata, `deal.workId`).

**Критерий:** закрытие сделки порождает учёт и заказ в Work.

### Этап 3 — master data и состав сделки

1. Коллекции `bh_companies`, `bh_contacts`, связи с Lead/Deal.
2. `bh_products`, `bh_deal_items`.
3. `pipelineId` + сид дефолтной воронки Sales; UI выбора воронки.

**Критерий:** сделка = компания + контакт + строки продуктов.

### Этап 4 — автоматизация и аналитика

1. Правила из п.9 (functions / jobs).
2. Дашборд CRM + KPI по менеджерам.
3. Расширенные источники (campaign, UTM), причины lost, подписки end-to-end.
4. Уведомления по событиям.

---

## 20. Цель

CRM в составе Business Hub:

- ведёт продажи от лида до оплаты;
- считает доход и воронку;
- создаёт **операции** и **Work**;
- поддерживает **подписки** и масштаб **крупной компании** (несколько воронок, роли, KPI).

---

## Приложение A — что уже есть в репозитории (кратко)

| Область | Файлы / коллекции |
|---------|-------------------|
| Лиды | `lib/models/business_hub/lead.dart`, `bh_leads` |
| Сделки | `deal.dart`, `bh_deals`, стадии как в п.3 |
| Активности | `activity.dart`, `bh_activities` |
| Операции + dealId | `operation.dart`, `bh_firestore_service` (createOperationFromWonDeal) |
| Задачи доставки | `task.dart`, `bh_tasks` — **не** CRM-задачи |
| Work | `lib/models/work.dart`, сервисы Work в BH |
| Дашборд BHS | `getDashboardStats`, CRM-метрики частично |
| Контрагенты | `bh_counterparties` |

---

## Приложение B — индексы Firestore (на будущее)

После добавления полей запланировать составные индексы, например:

- `bh_deals`: `organizationId` + `nextActionDate` + `nextActionDone`
- `bh_deals`: `organizationId` + `pipelineId` + `stage`
- `bh_crm_tasks`: `organizationId` + `assignedTo` + `dueDate`

---

*Версия документа: 1.0. Путь: `docs/CRM_ENTERPRISE_TZ.md`.*
