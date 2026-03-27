# Быстрая сборка для App Store

## Быстрый старт

```bash
cd ~/uzbekservice_app
./build_appstore.sh
```

## Текущие настройки

- **Версия:** 1.0.3+4
- **Bundle ID:** com.odo.uzapp.dev
- **Team ID:** YQL6CG483C

## После сборки

1. Откройте **Transporter** app
2. Перетащите IPA файл
3. Нажмите **"Deliver"**
4. В App Store Connect создайте новую версию
5. Выберите билд и отправьте на ревью

## Важно

⚠️ Убедитесь, что:
- Xcode закрыт перед сборкой
- У вас есть активная подписка Apple Developer Program
- Bundle ID зарегистрирован в App Store Connect

Подробные инструкции: `ПУБЛИКАЦИЯ_APP_STORE.md`
