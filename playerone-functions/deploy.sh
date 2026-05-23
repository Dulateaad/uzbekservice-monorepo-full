#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Firebase project: playerone-e6ff2 (Player One storage TTL)"
firebase use playerone-e6ff2
(cd functions && npm run build)
firebase deploy --only functions
