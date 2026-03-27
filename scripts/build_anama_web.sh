#!/usr/bin/env bash
# Сборка Anama Web: подмена web/index.html, manifest, favicon и icons (не ODO).
# Не вызывайте напрямую: flutter build web --output build/web_anama — в пакет попадёт web/index.html ODO.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 "$ROOT/scripts/gen_anama_web_assets.py"

cleanup() {
  if [[ -f web/.index.html.odo.bak ]]; then
    mv web/.index.html.odo.bak web/index.html
  fi
  if [[ -f web/.manifest.json.odo.bak ]]; then
    mv web/.manifest.json.odo.bak web/manifest.json
  fi
  if [[ -f web/.favicon.png.odo.bak ]]; then
    mv web/.favicon.png.odo.bak web/favicon.png
  fi
  if [[ -d web/.icons.odo.bak ]]; then
    rm -rf web/icons
    mv web/.icons.odo.bak web/icons
  fi
}
trap cleanup EXIT

cp web/index.html web/.index.html.odo.bak
cp web/manifest.json web/.manifest.json.odo.bak
cp web/favicon.png web/.favicon.png.odo.bak
rm -rf web/.icons.odo.bak
cp -R web/icons web/.icons.odo.bak

cp web_anama/index.html web/index.html
cp web_anama/manifest.json web/manifest.json
cp web_anama/favicon.png web/favicon.png
cp web_anama/icons/* web/icons/

# Меньше проблем со SW на медленных сетях (иначе бывает prepareServiceWorker timeout).
flutter build web -t lib/main_anama_pilot.dart --output build/web_anama --pwa-strategy=none

if grep -q "Twilio SMS" build/web_anama/index.html 2>/dev/null; then
  echo "Ошибка: в build/web_anama/index.html всё ещё шаблон основного приложения (Twilio). Запускайте только этот скрипт."
  exit 1
fi
if grep -qE '<title>[^<]*ODO' build/web_anama/index.html 2>/dev/null; then
  echo "Ошибка: в <title> остался чужой брендинг."
  exit 1
fi

echo "✓ build/web_anama (Anama: HTML, manifest, favicon, PWA-иконки)"
