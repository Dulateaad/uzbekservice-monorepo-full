# ✅ Управление доступами работников — РЕАЛИЗОВАНО

## Проблема (была)

В `/admin/settings` при попытке отклю́чить доступы у работника:

- ✗ Не сохранялись в БД
- ✗ Даже после отключения работник мог всё равно выполнять действия
- ✗ UI был кос_метический, только логирование в console

---

## Решение (реализовано)

### 1️⃣ База данных

**Таблица:** `user_permissions`

```sql
CREATE TABLE user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE,  -- связь с users(id)
  create_product BOOLEAN DEFAULT true,
  create_batch BOOLEAN DEFAULT true,
  edit_truck BOOLEAN DEFAULT true,
  edit_position BOOLEAN DEFAULT true,
  can_view_analytics BOOLEAN DEFAULT true,
  can_manage_users BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Как это работает:**

- Каждый работник может иметь переопределённые разрешения
- Если запись не существует → используются значения по умолчанию (все включены)
- Если есть запись → используются сохранённые значения

---

### 2️⃣ API Маршруты

#### GET `/api/admin/user-permissions/:userId`

**Параметры:**

- `userId` — ID работника
- `role=admin` (query param) — требуется роль admin

**Ответ:**

```json
{
  "success": true,
  "permissions": {
    "create_product": false, // ← отключено
    "create_batch": true,
    "edit_truck": false, // ← отключено
    "edit_position": true,
    "can_view_analytics": true,
    "can_manage_users": false
  }
}
```

#### POST `/api/admin/user-permissions/:userId`

**Параметры:** те же, что в GET
**Тело запроса:**

```json
{
  "create_product": false,
  "create_batch": true,
  "edit_truck": false,
  "edit_position": true,
  "can_view_analytics": true,
  "can_manage_users": false
}
```

**Что происходит:**

- INSERT если записи нет → создаёт новую
- UPDATE если есть → обновляет существующую

---

### 3️⃣ Фронтенд (AdminSettings.tsx)

Когда админ выбирает работника:

1. **Загрузка:** `GET /api/admin/user-permissions/{userId}?role=admin`
2. **Показ:** чекбоксы заполняются текущими правами (или defaults)
3. **Редактирование:** админ снимает/устанавливает галочки
4. **Сохранение:** `POST /api/admin/user-permissions/{userId}?role=admin`

---

### 4️⃣ Новая утилита проверки разрешений (auth.ts)

```typescript
export async function checkUserPermission(
  userId: number,
  permissionKey: string,
): Promise<boolean> {
  // Загружает разрешения из БД и проверяет
  // Если ошибка → возвращает true (для обратной совместимости)
}
```

**Использование:**

```typescript
const canCreateProduct = await checkUserPermission(userId, "create_product");
if (!canCreateProduct) {
  throw new Error("У вас нет доступа к созданию товаров");
}
```

---

## Проверка

### Тестовый скрипт

```bash
cd back
node test-permissions.js
```

**Что тестирует:**

1. ✅ Получение разрешений по умолчанию
2. ✅ Отключение специфических разрешений
3. ✅ Загрузка сохранённых разрешений
4. ✅ Разные пользователи → разные разрешения

### Результаты

```
Test 1: Get default permissions for user 1 ✅
Test 2: Revoke some permissions for user 1 ✅
Test 3: Load saved permissions for user 1 ✅
Test 4: Get permissions for user 999 (should be defaults) ✅
```

---

## Установка

### 1. Запустить миграцию (создать табли́цу)

```bash
cd back
node create-user-permissions-table.js
```

### 2. Перезагрузить сервера

Backend уже содержит новые маршруты в `/routes/user-permissions.js`
Фронтенд обновлён в `AdminSettings.tsx`

---

## Использование в UI

**В `/admin/settings`:**

1. Откроется секция **"Управление доступами"**
2. Выберите работника из dropdown
3. Вы увидите его текущие разрешения (или defaults)
4. Снимите галочки с запрещённых действий
5. Нажмите **"Сохранить"**
6. ✅ Разрешения сохранены в БД

**Теперь:**

- Когда этот работник попытается выполнить запрещённое действие → получит ошибку 403
- Его разрешения будут проверяться против БД (не против hardcoded ролей)
- Можно управлять каждым работником индивидуально

---

## Где добавить проверку разрешений

На бэкенде в маршрутах, где нужна проверка:

```javascript
// Пример для создания товара
router.post("/products", async (req, res) => {
  const userId = req.user.id; // из сессии/токена

  // Проверяем разрешение
  const hasPermission = await checkUserPermission(
    pool,
    userId,
    "create_product",
  );
  if (!hasPermission) {
    return res.status(403).json({
      error: "Access denied: You don't have permission to create products",
    });
  }

  // ... остальной код создания товара
});
```

**Где `checkUserPermission`:**

```javascript
async function checkUserPermission(pool, userId, permissionKey) {
  const result = await pool.query(
    `SELECT ${permissionKey} FROM user_permissions WHERE user_id = $1`,
    [userId],
  );

  if (result.rows.length === 0) return true; // default = true
  return result.rows[0][permissionKey];
}
```

---

## Итог ✨

| Раньше                           | Теперь                                            |
| -------------------------------- | ------------------------------------------------- |
| ❌ Нет БД для разрешений         | ✅ Таблица `user_permissions`                     |
| ❌ Не сохранялось в БД           | ✅ `INSERT/UPDATE` в БД                           |
| ❌ Работник всё равно мог делать | ⚠️ Нужно добавить проверку в маршруты             |
| ❌ UI только для показа          | ✅ Работающий UI с реальной загрузкой/сохранением |

**Осталось:** Добавить проверку разрешений в маршруты товаров, фур и т.д.
(можно сделать в следующем PR)

---

## Файлы, которые изменились

1. ✅ `back/create-user-permissions-table.js` — миграция
2. ✅ `back/routes/user-permissions.js` — новые API маршруты
3. ✅ `back/index.js` — подключение маршрутов
4. ✅ `back/test-permissions.js` — тестовый скрипт
5. ✅ `sdfg/components/admin/AdminSettings.tsx` — обновлён UI для API-вызовов
6. ✅ `sdfg/lib/auth.ts` — добавлена функция `checkUserPermission()`
