# ODO — Universal Work Architecture

## Ядро системы

```
ODO CORE
──────────────────
Users
Organizations
Roles (BHMemberRole + WorkRole)
Work
Operations
Tasks
──────────────────
```

## Work — единая сущность

Все активности в платформе — это **Work**:

| Тип (WorkType) | Пользователь видит |
|----------------|-------------------|
| `serviceRequest` | Заявка на услугу |
| `jobPosition` | Вакансия |
| `jobApplication` | Отклик на вакансию |
| `order` | Заказ |
| `delivery` | Доставка |
| `task` | Задача |
| `project` | Проект |
| `consultation` | Консультация |

## Статусы Work

- `created` — Создано
- `accepted` — Принято
- `inProgress` — В работе
- `completed` — Завершено
- `cancelled` — Отменено
- `failed` — Не выполнено

## Иерархия ролей (WorkRole)

```
Owner (владелец)
  ├── РОП (руководитель отдела продаж) → добавляет менеджеров
  ├── Оператор (колл-центр)
  ├── Старший логист → добавляет курьеров
  └── Бухгалтер

РОП → Менеджер 1, Менеджер 2
Старший логист → Курьер 1, Курьер 2
```

Поле `managerId` в `BHOrganizationMember` — ID руководителя.

## Связь Work → Operation

При `Work.status = completed` можно автоматически создавать `BHOperation` (sale, service и т.д.).

## Firestore

- Коллекция: `works`
- Индексы: organizationId + updatedAt, organizationId + type + updatedAt, organizationId + assignedTo + updatedAt
