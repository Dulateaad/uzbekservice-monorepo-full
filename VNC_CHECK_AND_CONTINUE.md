# Проверка установки PostgreSQL и продолжение

## 🔍 Шаг 1: Проверка установки PostgreSQL

Выполните в VNC терминале:

```bash
psql --version
```

Если версия показана - PostgreSQL установлен! ✅

---

## 🔍 Шаг 2: Проверка статуса службы

```bash
systemctl status postgresql --no-pager
```

Если служба не запущена, выполните:

```bash
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql --no-pager
```

---

## ✅ Шаг 3: Создание БД и пользователя (Блок 2)

После успешной установки выполните:

```bash
su - postgres
```

Затем внутри сессии postgres выполните по очереди:

```bash
createdb uzbekservice_db
```

```bash
createuser uzbekservice_user
```

```bash
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
```

```bash
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
```

```bash
exit
```

---

## 🔍 Шаг 4: Проверка создания БД

```bash
su - postgres -c "psql -l" | grep uzbekservice
```

Должна быть видна база `uzbekservice_db`.

---

## 📋 Дальнейшие шаги

После успешного создания БД продолжайте с **Блока 3** (Установка Node.js) из файла `VNC_FIXED_COMMANDS.md`.

---

## ⚠️ Если PostgreSQL не установился

Попробуйте установить стандартную версию:

```bash
dnf install -y postgresql-server postgresql
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
```

Затем проверьте версию:

```bash
psql --version
```

И продолжайте с Шагом 3 (создание БД).

