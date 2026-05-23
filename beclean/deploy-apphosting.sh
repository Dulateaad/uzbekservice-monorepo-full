#!/usr/bin/env bash
# Деплой App Hosting (backend id: studio). Проект по умолчанию — из .firebaserc.
# Другой проект: ./deploy-apphosting.sh other-project-id
set -euo pipefail
cd "$(dirname "$0")"

if [[ $# -ge 1 ]]; then
  firebase use "$1"
fi

firebase deploy --only apphosting:studio
