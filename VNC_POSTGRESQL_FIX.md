# Исправление установки PostgreSQL

## Проблема: PostgreSQL 15 не найден в репозиториях

AlmaLinux может не иметь PostgreSQL 15 в стандартных репозиториях. Используем официальный репозиторий PostgreSQL.

---

## Вариант 1: Установка через официальный репозиторий PostgreSQL (рекомендуется)

### Шаг 1: Добавление репозитория PostgreSQL

```bash
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
```

### Шаг 2: Установка PostgreSQL 15

```bash
dnf install -y postgresql15-server postgresql15
```

### Шаг 3: Инициализация и запуск

```bash
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql --no-pager
```

---

## Вариант 2: Использование стандартного PostgreSQL (если вариант 1 не работает)

### Шаг 1: Проверка доступных версий

```bash
dnf search postgresql-server
```

### Шаг 2: Установка доступной версии (обычно 13 или 14)

```bash
dnf install -y postgresql-server postgresql
```

### Шаг 3: Инициализация и запуск

```bash
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql --no-pager
```

---

## После успешной установки продолжайте с Блоком 2

Выполните в VNC терминале:

```bash
su - postgres
createdb uzbekservice_db
createuser uzbekservice_user
psql -c "ALTER USER uzbekservice_user WITH PASSWORD 'Uzbekservice2026Secure';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE uzbekservice_db TO uzbekservice_user;"
exit
```

---

## Проверка версии PostgreSQL

```bash
psql --version
```

---

## Если возникли проблемы

### Проверка репозиториев

```bash
dnf repolist | grep postgres
```

### Альтернатива: Установка через dnf module

```bash
dnf module list postgresql
dnf module enable postgresql:13 -y
dnf install -y postgresql-server postgresql
```

