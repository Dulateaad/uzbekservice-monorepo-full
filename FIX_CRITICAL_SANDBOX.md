# 🔧 Критические Sandbox ошибки - Решение

## ❌ Ошибки:
```
Sandbox: dartvm deny file-read-data
Sandbox: rsync deny file-read-data
Sandbox: dartvm deny file-write-create
```

Xcode не может читать/писать файлы проекта.

## ✅ РЕШЕНИЕ: Full Disk Access

### Шаг 1: Откройте System Settings

1. Нажмите на **логотип Apple** 🍎 в левом верхнем углу
2. Выберите **System Settings** (или **System Preferences** в старых версиях)

### Шаг 2: Перейдите в Privacy & Security

1. В System Settings найдите **Privacy & Security**
2. Прокрутите вниз до **Full Disk Access**

### Шаг 3: Добавьте Xcode

1. **Если Xcode НЕТ в списке:**
   - Нажмите кнопку **+** (плюс) внизу списка
   - В Finder найдите **Xcode** в `/Applications`
   - Выберите Xcode и нажмите **Open**
   - **ВКЛЮЧИТЕ** переключатель рядом с Xcode

2. **Если Xcode ЕСТЬ, но выключен:**
   - **ВКЛЮЧИТЕ** переключатель рядом с Xcode

### Шаг 4: Перезапустите Xcode

1. **Закройте Xcode полностью** (`Cmd + Q`)
2. **Откройте снова:**
   ```bash
   open ~/uzbekservice_app/ios/Runner.xcworkspace
   ```

### Шаг 5: Попробуйте сборку

1. **Product** → **Clean Build Folder** (`Shift + Cmd + K`)
2. **Product** → **Build** (`Cmd + B`)

## 🔍 Альтернативные решения:

### Вариант 1: Перезапустите Mac

Иногда помогает полный перезапуск системы:
1. Сохраните все работы
2. Перезапустите Mac
3. После перезапуска попробуйте сборку снова

### Вариант 2: Проверьте права на файлы

```bash
cd ~/uzbekservice_app
chmod -R 755 .
```

### Вариант 3: Соберите для симулятора

Для тестирования (не для TestFlight):
```bash
flutter build ios --simulator
```

### Вариант 4: Используйте другой аккаунт

Если проблема сохраняется, попробуйте:
- Создать новый пользователь macOS
- Или использовать другой Mac

## ⚠️ Важно:

**Full Disk Access** - это критически важно для Xcode. Без этого Xcode не может:
- Читать файлы проекта
- Записывать в Derived Data
- Создавать build артефакты

## ✅ После исправления:

- ✅ Sandbox ошибки должны исчезнуть
- ✅ Xcode сможет читать/писать файлы
- ✅ Сборка должна пройти успешно
- ✅ Можно создавать Archive

## 📱 После успешной сборки:

1. **Product** → **Archive**
2. **Organizer** → **Distribute App**
3. **App Store Connect** → **Upload**
4. Загрузка в TestFlight

## 💡 Проверка:

После добавления Full Disk Access:
1. Убедитесь, что переключатель **ВКЛЮЧЕН** (зеленый)
2. Перезапустите Xcode
3. Попробуйте сборку

Если ошибки сохраняются после этого, возможно нужно перезапустить Mac.





