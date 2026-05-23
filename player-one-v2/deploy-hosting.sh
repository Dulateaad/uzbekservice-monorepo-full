#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/apps/web"
npm ci
npm run build
cd "$ROOT"
echo "Deploy Firebase Hosting (project from .firebaserc)..."
firebase deploy --only hosting "$@"
