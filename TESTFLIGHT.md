# Сборка для TestFlight

## Быстрый старт

```bash
cd ~/uzbekservice_app
./build_testflight.sh
```

С флагами:
- `--force` — пропустить проверку Xcode (если Xcode открыт)
- `--clean` — полная переустановка CocoaPods (медленнее, но надёжнее)

## Примеры

```bash
# Обычная сборка (закройте Xcode перед запуском)
./build_testflight.sh

# Сборка при открытом Xcode
./build_testflight.sh --force

# Полная переустановка CocoaPods + сборка
./build_testflight.sh --force --clean
```

## После сборки

1. **Transporter** — приложение из App Store.
2. Откройте Transporter и перетащите IPA:
   ```
   build/ios/ipa/odo_uz_app.ipa
   ```
3. Нажмите **Deliver**.
4. В **App Store Connect** → **TestFlight** появится новый билд.
5. Добавьте тестовых пользователей (внешние или внутренние).

## Текущие настройки

- **Версия:** 1.0.3+4
- **Bundle ID:** com.odo.uzapp.dev
- **Team ID:** YQL6CG483C

## Требования

- Mac с Xcode
- Активная подписка Apple Developer Program
- Bundle ID зарегистрирован в App Store Connect
- Закрытый Xcode (или используйте `--force`)

## Длительность

Сборка обычно занимает **10–20 минут**.
