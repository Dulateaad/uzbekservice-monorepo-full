# 📧 Как работает Email для родительского согласия

## 🎯 Простыми словами:

### Что нужно настроить:
**Email сервис для ОТПРАВКИ писем** (Gmail или SendGrid)
- Это как почтовый ящик, из которого будут отправляться письма
- Нужен для того, чтобы Firebase Function могла отправлять письма

### Откуда родители получат письма:
**На свой обычный email адрес** (любой email родителя)
- Родитель вводит свой email в приложении (например: `parent@gmail.com`)
- Письмо придет на этот email адрес
- Родитель может использовать любой email: Gmail, Mail.ru, Yandex и т.д.

---

## 🔄 Как это работает:

```
1. Родитель вводит свой email в приложении
   Например: parent@gmail.com
   
2. Приложение вызывает Firebase Function
   
3. Firebase Function отправляет письмо через SMTP сервер
   (Gmail или SendGrid - это то, что нужно настроить)
   
4. Письмо доставляется на email родителя
   parent@gmail.com ← Родитель получает письмо здесь
```

---

## 📧 Два разных email:

### 1. Email для ОТПРАВКИ (нужно настроить):
**Это сервис, который отправляет письма**

**Вариант A: Gmail**
- Ваш Gmail аккаунт (например: `anama.app@gmail.com`)
- Используется для ОТПРАВКИ писем родителям
- Нужен App Password для настройки

**Вариант B: SendGrid**
- Сервис для отправки email
- Более надежный для production
- Нужен API Key для настройки

### 2. Email родителя (вводит родитель):
**Это email адрес, куда придут письма**

- Родитель вводит свой email в приложении
- Может быть любой email: `parent@gmail.com`, `parent@mail.ru`, `parent@yandex.ru` и т.д.
- На этот адрес придет письмо с OTP кодом

---

## 🔧 Что нужно сделать:

### Шаг 1: Настроить Email сервис для отправки

Выберите один вариант:

#### Вариант A: Gmail (для тестирования)

1. Возьмите ваш Gmail аккаунт (или создайте новый)
2. Получите App Password (см. инструкцию выше)
3. Настройте конфигурацию:

```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="ВАШ_GMAIL@gmail.com" \
  email.password="ВАШ_APP_PASSWORD" \
  email.from="ВАШ_GMAIL@gmail.com" \
  email.from_name="Anama App"
```

**Пример:**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="anama.app@gmail.com" \
  email.password="abcd efgh ijkl mnop" \
  email.from="anama.app@gmail.com" \
  email.from_name="Anama App"
```

**Что это значит:**
- Письма будут отправляться ОТ имени `anama.app@gmail.com`
- Родители увидят отправителя: "Anama App <anama.app@gmail.com>"

#### Вариант B: SendGrid (для production)

1. Зарегистрируйтесь в SendGrid
2. Получите API Key
3. Настройте конфигурацию:

```bash
firebase functions:config:set \
  email.host="smtp.sendgrid.net" \
  email.port="587" \
  email.user="apikey" \
  email.password="SG.ВАШ_API_KEY" \
  email.from="noreply@anama.app" \
  email.from_name="Anama App"
```

**Что это значит:**
- Письма будут отправляться ОТ имени `noreply@anama.app`
- Родители увидят отправителя: "Anama App <noreply@anama.app>"

---

## 📨 Пример работы:

### Сценарий:

1. **Родитель вводит свой email в приложении:**
   ```
   Email: parent@gmail.com
   ```

2. **Firebase Function отправляет письмо:**
   ```
   От: Anama App <anama.app@gmail.com>
   Кому: parent@gmail.com
   Тема: Код подтверждения для Anama App
   Содержимое: Ваш код: 123456
   ```

3. **Родитель получает письмо:**
   - Открывает свой Gmail: `parent@gmail.com`
   - Видит письмо от "Anama App"
   - Читает код: `123456`
   - Вводит код в приложении

---

## ✅ Итого:

### Что нужно настроить:
- ✅ Email сервис для ОТПРАВКИ (Gmail или SendGrid)
- ✅ Это делается один раз при настройке

### Что делает родитель:
- ✅ Вводит свой email в приложении
- ✅ Получает письмо на свой email
- ✅ Может использовать любой email (Gmail, Mail.ru, Yandex и т.д.)

---

## 🎯 Рекомендация:

**Для начала (тестирование):**
- Используйте Gmail
- Создайте отдельный Gmail аккаунт для приложения (например: `anama.app@gmail.com`)
- Получите App Password
- Настройте конфигурацию

**Для production:**
- Используйте SendGrid
- Настройте домен `@anama.app` (опционально)
- Используйте `noreply@anama.app` как отправителя

---

## 📋 Быстрая настройка Gmail:

1. **Создайте Gmail аккаунт** (если нет): https://accounts.google.com/signup
   - Например: `anama.app@gmail.com`

2. **Получите App Password:**
   - https://myaccount.google.com/apppasswords
   - Создайте пароль для "Почта"

3. **Настройте конфигурацию:**
```bash
firebase functions:config:set \
  email.host="smtp.gmail.com" \
  email.port="587" \
  email.user="anama.app@gmail.com" \
  email.password="ВАШ_APP_PASSWORD" \
  email.from="anama.app@gmail.com" \
  email.from_name="Anama App"
```

4. **Готово!** Теперь родители будут получать письма на свой email

---

**Вопросы?** Скажите, какой вариант выбираете, и я помогу с настройкой! 🚀

