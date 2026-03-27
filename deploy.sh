#!/usr/bin/env bash
# Деплой ODO Business Hub (Firebase Hosting).
set -euo pipefail
cd "$(dirname "$0")"

echo "🔨 Сборка Flutter Web..."
flutter build web --release

echo ""
echo "🚀 Деплой Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Готово: https://odo-business-hub.web.app"
