# Где выполнять команды

## ⚠️ Важно: Разница между Mac и VPS

### На Mac (локальная машина):
- Директория: `/Users/dulatea/uzbekservice_app`
- Здесь находится Flutter проект
- Здесь можно редактировать код

### На VPS (удаленный сервер):
- Директория: `/var/www/api`
- Здесь находится API сервер
- Здесь нужно создавать `.env` файл

---

## 📋 Где выполнять команды

### Команды для VPS (выполнять в VNC терминале):

```bash
# Эти команды выполняются на VPS через VNC
cd /var/www/api
cat .env
echo "API_KEY=..." >> .env
systemctl restart uzbekservice-api
```

### Команды для Mac (выполнять в локальном терминале):

```bash
# Эти команды выполняются на Mac
cd /Users/dulatea/uzbekservice_app
code lib/services/vps_api_service.dart
flutter run
```

---

## 🔄 Загрузка файлов с Mac на VPS

Если нужно загрузить файл с Mac на VPS:

```bash
# На Mac в терминале
scp /path/to/file root@95.46.96.53:/var/www/api/
```

---

## 📝 Текущая задача: Создание .env на VPS

### Вариант 1: Через VNC терминал (рекомендуется)

1. Откройте VNC терминал на VPS
2. Выполните команды из `VNC_ENV_STEP_BY_STEP.md`

### Вариант 2: Загрузка с Mac

1. Файл уже создан: `/tmp/vps_env_template.txt`
2. Загрузите на VPS:
   ```bash
   scp /tmp/vps_env_template.txt root@95.46.96.53:/var/www/api/.env
   ```

---

## ✅ Проверка

После создания `.env` на VPS, проверьте в VNC терминале:

```bash
cd /var/www/api
cat .env
grep API_KEY .env
```

