# 🔧 Исправление Sandbox ошибок (если Full Disk Access уже включен)

## ✅ Если Full Disk Access уже включен, но ошибки остаются:

### 1. Проверить, что доступ действительно работает

```bash
# Проверить статус TCC (Transparency, Consent, and Control)
tccutil reset All com.apple.dt.Xcode
```

**⚠️ Может потребоваться пароль**

### 2. Исправить права на DerivedData

```bash
# Удалить старый DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Создать заново с правильными правами
mkdir -p ~/Library/Developer/Xcode/DerivedData
chmod 755 ~/Library/Developer/Xcode/DerivedData
```

### 3. Исправить права на проект

```bash
cd ~/uzbekservice_app

# Убедиться, что вы владелец
sudo chown -R $(whoami) .

# Дать права на запись
chmod -R u+w .
```

### 4. Закрыть все процессы Xcode

```bash
# Закрыть все процессы
killall Xcode 2>/dev/null || true
killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true

# Подождать
sleep 5

# Очистить кэш
flutter clean
```

### 5. Перезапустить Mac

**Это важно!** Даже если Full Disk Access включен, иногда нужен перезапуск для полного применения прав.

---

## 🔍 Альтернативные причины Sandbox ошибок:

### Причина 1: macOS 26.1 известные проблемы

В некоторых версиях macOS 26.1 есть баги с sandbox. Решение:
- Обновить macOS до последней версии
- Или использовать обходные пути

### Причина 2: Конфликт с другими инструментами

Если установлены:
- Android Studio
- VS Code с расширениями
- Другие IDE

Они могут блокировать файлы. Решение:
- Закрыть все IDE перед сборкой
- Использовать только Xcode

### Причина 3: Проблемы с путями

Если проект в нестандартном месте или есть пробелы в путях:
```bash
# Проверить путь
pwd

# Если есть пробелы - могут быть проблемы
```

### Причина 4: Проблемы с CocoaPods

```bash
cd ~/uzbekservice_app/ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install --repo-update
```

---

## 🚀 Полное решение (выполнить по порядку):

```bash
cd ~/uzbekservice_app

# 1. Закрыть все процессы
killall Xcode 2>/dev/null || true
sleep 3

# 2. Очистить все кэши
flutter clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*
rm -rf ios/Pods ios/Podfile.lock

# 3. Исправить права
sudo chown -R $(whoami) ~/Library/Developer/Xcode/DerivedData/
sudo chmod -R u+w ~/Library/Developer/Xcode/DerivedData/
sudo chown -R $(whoami) ~/uzbekservice_app

# 4. Переустановить Pods
cd ios
pod install --repo-update
cd ..

# 5. Перезапустить Mac (важно!)
echo "Теперь перезапустите Mac и попробуйте снова"
```

---

## 🔍 Проверка после исправлений:

```bash
# Попробовать сборку
flutter build ios --release --no-codesign

# Если ошибок нет - значит исправлено!
```

---

## 💡 Если ничего не помогает:

### Вариант 1: Использовать Xcode напрямую

Вместо `flutter build` использовать Xcode:
1. Открыть `ios/Runner.xcworkspace`
2. Product → Archive
3. Создать IPA из архива

### Вариант 2: Использовать симулятор

Для тестирования можно использовать симулятор:
```bash
flutter run -d "iPhone 15 Pro"
```

### Вариант 3: Собрать на другом Mac

Если есть доступ к другому Mac - попробовать там.

---

**Попробуйте выполнить команды выше и перезапустить Mac!**

