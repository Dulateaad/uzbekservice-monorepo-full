#!/bin/bash
# Деплой открытки «Аида» на Firebase Hosting
# Открытка будет по адресу: https://<твой-проект>.web.app/valentine/

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/build/web/valentine"
cp "$ROOT/valentine/index.html" "$ROOT/build/web/valentine/index.html"
echo "✓ Скопировано в build/web/valentine/"
cd "$ROOT"
echo "Деплой на Firebase..."
firebase deploy --only hosting
echo ""
echo "Готово! Открытка: https://<твой-проект>.web.app/valentine/"
