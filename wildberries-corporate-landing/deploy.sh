#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "→ $(pwd)"
npm run build
firebase deploy --only hosting --project wildberries-ee62e
