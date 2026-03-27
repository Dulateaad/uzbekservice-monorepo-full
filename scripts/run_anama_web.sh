#!/usr/bin/env bash
# Локальный запуск пилота в Chrome с HTML/Manifest/favicon/icons Anama (без ODO).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 "$ROOT/scripts/gen_anama_web_assets.py"

restore() {
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
trap restore EXIT

cp web/index.html web/.index.html.odo.bak
cp web/manifest.json web/.manifest.json.odo.bak
cp web/favicon.png web/.favicon.png.odo.bak
rm -rf web/.icons.odo.bak
cp -R web/icons web/.icons.odo.bak

cp web_anama/index.html web/index.html
cp web_anama/manifest.json web/manifest.json
cp web_anama/favicon.png web/favicon.png
cp web_anama/icons/* web/icons/

flutter run -d chrome -t lib/main_anama_pilot.dart "$@"
