# 🖼️ Исправление загрузки изображений

## Что было исправлено:

### 1. ✅ AddPositionModal - исправлено имя поля

- **Было:** `data.append("image", ...)`
- **Стало:** `data.append("photo", ...)`
- **Файл:** `sdfg/components/inventory/AddPositionModal.tsx`

### 2. ✅ Next.js конфигурация - добавлена поддержка бэкенда

- **Файл:** `sdfg/next.config.mjs`
- **Добавлено:** `remotePatterns` для `http://localhost:5000/uploads/**`

### 3. ✅ InventoryTable - добавлена функция для преобразования URL

- **Файл:** `sdfg/components/inventory/InventoryTable.tsx`
- **Добавлено:** `getImageUrl()` функция для преобразования относительных путей в полные URL

## Как это работает:

```
1. Пользователь загружает изображение в AddPositionModal
2. FormData отправляет с полем "photo" ✅
3. API сохраняет файл в /public/uploads/ на бэкенде
4. API возвращает photo_url: "/uploads/inventory-1234567.jpg"
5. Компонент InventoryTable получает photo_url
6. getImageUrl() преобразует "/uploads/..." → "http://localhost:5000/uploads/..."
7. Next.js Image компонент загружает изображение с бэкенда
8. Изображение отображается в таблице ✅
```

## Для тестирования:

1. Убедитесь, что бэкенд запущен на портуке 5000
2. Убедитесь, что папка `back/public/uploads` существует
3. Загрузите новую позицию с изображением
4. Изображение должно появиться в таблице

## Если изображение не видно:

1. Откройте DevTools (F12)
2. Проверьте Network tab - посмотрите на запрос изображения
3. Проверьте URL - должен быть `http://localhost:5000/uploads/inventory-...`
4. Проверьте Console - могут быть ошибки загрузки

---

**Система изображений теперь готова к использованию!** 🎉
