# 🔄 Перезапуск приложения для применения изменений

## ⚠️ Важно: После изменений в коде нужно перезапустить приложение

### Быстрый способ (Hot Restart):

1. **В терминале где запущено приложение:**
   - Нажмите `R` (заглавная R) для Hot Restart
   - Или `r` (маленькая r) для Hot Reload

2. **В VS Code/Android Studio:**
   - Нажмите кнопку "Hot Restart" (🔄)
   - Или используйте команду: `Ctrl+Shift+F5` (Windows/Linux) или `Cmd+Shift+F5` (Mac)

### Полный перезапуск (рекомендуется):

```bash
# 1. Остановите текущее приложение (Ctrl+C в терминале)

# 2. Очистите кеш
cd /Users/dulatea/uzbekservice_app
flutter clean
flutter pub get

# 3. Запустите заново
flutter run
```

### Для iOS:
```bash
cd /Users/dulatea/uzbekservice_app
flutter run -d ios
```

### Для Android:
```bash
cd /Users/dulatea/uzbekservice_app
flutter run -d android
```

### Для Web:
```bash
cd /Users/dulatea/uzbekservice_app
flutter run -d chrome
```

---

## ✅ Что должно появиться после перезапуска:

1. **Переключатель вверху экрана:**
   ```
   [Войти]  [Создать аккаунт]
   ```

2. **При выборе "Войти":**
   - Заголовок: "Вход в аккаунт"
   - Поле имени **скрыто**
   - Кнопка: "Войти"

3. **При выборе "Создать аккаунт":**
   - Заголовок: "Создание аккаунта"
   - Поле имени **показано**
   - Кнопка: "Создать аккаунт"

4. **При выборе "Специалист":**
   - Показывается сообщение о OneID
   - Кнопка "Войти через OneID"
   - Поля SMS скрыты

---

## 🐛 Если изменения не появились:

1. **Убедитесь, что файл сохранен:**
   ```bash
   grep "_isRegistration" lib/screens/auth/beautiful_login_screen.dart
   ```
   Должно показать несколько строк с `_isRegistration`

2. **Проверьте, что нет ошибок компиляции:**
   ```bash
   flutter analyze lib/screens/auth/beautiful_login_screen.dart
   ```

3. **Полная очистка и перезапуск:**
   ```bash
   flutter clean
   rm -rf build/
   flutter pub get
   flutter run
   ```

4. **Для iOS - пересоберите:**
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   flutter run
   ```

---

## 📱 Проверка в приложении:

После перезапуска проверьте:

1. ✅ Переключатель "Войти" / "Создать аккаунт" виден
2. ✅ При "Войти" - поле имени скрыто
3. ✅ При "Создать аккаунт" - поле имени показано
4. ✅ При выборе "Специалист" - показывается OneID кнопка

---

**Если после перезапуска изменения не появились, сообщите - проверю код еще раз!**

