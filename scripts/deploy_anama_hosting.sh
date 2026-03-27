#!/usr/bin/env bash
# Сборка пилота Anama и деплой только Hosting anama-app (не путать с odo-business-hub).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
"$ROOT/scripts/build_anama_web.sh"
firebase deploy --only hosting:anama-app --project anama-app
