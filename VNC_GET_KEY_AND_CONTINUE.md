# Получение API ключа и продолжение настройки

## ✅ .env файл создан!

## 🔑 Получение API ключа

Выполните в VNC терминале:

```bash
# Показать только API_KEY
grep API_KEY /var/www/api/.env

# Или показать весь файл
cat /var/www/api/.env
```

Вы увидите что-то вроде:
```
API_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**⚠️ ВАЖНО: Скопируйте этот ключ!** Он понадобится для Flutter приложения.

---

## 📋 Следующий шаг: Замена API сервера

После получения ключа, выполните команды из `VNC_REPLACE_API_SERVER.md`:

1. Создайте резервную копию старого сервера
2. Создайте защищенный сервер
3. Замените старый сервер
4. Перезапустите сервис
5. Протестируйте

---

## 🚀 Быстрый старт

Если хотите продолжить прямо сейчас:

```bash
cd /var/www/api

# 1. Получаем API ключ
API_KEY=$(grep API_KEY .env | cut -d'=' -f2)
echo "API ключ: $API_KEY"

# 2. Создаем резервную копию
cp vps_api_server.js vps_api_server.js.backup

# 3. Продолжайте с созданием защищенного сервера
# (см. VNC_REPLACE_API_SERVER.md)
```

---

## ✅ После замены сервера

1. **Перезапустите сервис:**
   ```bash
   systemctl restart uzbekservice-api
   systemctl status uzbekservice-api
   ```

2. **Протестируйте:**
   ```bash
   API_KEY=$(grep API_KEY /var/www/api/.env | cut -d'=' -f2)
   
   # Без ключа (должна быть ошибка 401)
   curl http://localhost:3000/api/stats
   
   # С ключом (должен работать)
   curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/stats
   ```

3. **Обновите Flutter приложение:**
   - Откройте `lib/services/vps_api_service.dart`
   - Найдите: `static const String _apiKey = 'YOUR_API_KEY_HERE';`
   - Замените `YOUR_API_KEY_HERE` на ключ из .env

---

## 📄 Документация

- `VNC_REPLACE_API_SERVER.md` - полная инструкция по замене API сервера
- `VNC_CREATE_ENV_SIMPLE.md` - создание .env файла

