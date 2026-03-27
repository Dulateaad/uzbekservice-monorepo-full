# Следующие шаги после создания БД

## ✅ БД и пользователь созданы!

Теперь продолжаем с установкой Node.js и настройкой API.

---

## Блок 3: Установка Node.js

Выполните в VNC терминале:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs && node --version && npm --version
```

---

## Блок 4: Создание директорий

```bash
mkdir -p /var/www/api /root/setup && echo "Директории созданы"
```

---

## Блок 5: Загрузка файлов с Mac

**Откройте НОВЫЙ терминал на вашем Mac** и выполните:

```bash
cd /Users/dulatea/uzbekservice_app
scp vps_create_tables.sql root@95.46.96.53:/root/setup/
scp vps_api_server.js vps_api_package.json root@95.46.96.53:/var/www/api/
```

Введите пароль VPS когда запросит.

---

## Блок 6: Создание таблиц (вернитесь в VNC)

После загрузки файлов, в VNC терминале выполните:

```bash
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -f /root/setup/vps_create_tables.sql"
```

---

## Блок 7: Установка зависимостей API

```bash
cd /var/www/api && npm install && echo "Зависимости установлены"
```

---

## Блок 8: Создание .env файла

```bash
cat > /var/www/api/.env <<'ENVEOF'
PORT=3000
DB_USER=uzbekservice_user
DB_HOST=localhost
DB_NAME=uzbekservice_db
DB_PASSWORD=Uzbekservice2026Secure
DB_PORT=5432
NODE_ENV=production
ENVEOF
echo "Файл .env создан"
```

---

## Блок 9: Создание systemd service

```bash
cat > /etc/systemd/system/uzbekservice-api.service <<'SERVICEEOF'
[Unit]
Description=Uzbekservice API Server
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /var/www/api/vps_api_server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF
systemctl daemon-reload
systemctl start uzbekservice-api
systemctl enable uzbekservice-api
systemctl status uzbekservice-api --no-pager
```

---

## Блок 10: Настройка firewall

```bash
firewall-cmd --permanent --add-port=3000/tcp && firewall-cmd --reload && echo "Firewall настроен"
```

---

## Блок 11: Проверка работы

```bash
sleep 3 && curl http://localhost:3000/health && echo "" && echo "API работает!"
```

---

## 🔍 Дополнительная проверка БД

Если хотите убедиться, что БД создана:

```bash
su - postgres -c "psql -U uzbekservice_user -d uzbekservice_db -c '\dt'"
```

Или:

```bash
su - postgres -c "psql -l"
```

Должна быть видна база `uzbekservice_db`.

