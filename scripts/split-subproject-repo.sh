#!/usr/bin/env bash
# Export one subdirectory of the monorepo into a branch with only that tree's history.
# Usage: ./scripts/split-subproject-repo.sh <prefix> [source-branch] [export-branch]
# Example: ./scripts/split-subproject-repo.sh kira-ai-final main kira-export
set -euo pipefail

PREFIX="${1:?Usage: $0 <prefix-dir> [source-branch=main] [export-branch=<prefix-export>]}"
SOURCE_BRANCH="${2:-main}"
EXPORT_BRANCH="${3:-${PREFIX//\//-}-export}"

cd "$(git rev-parse --show-toplevel)"

if [[ ! -d "$PREFIX" ]]; then
  echo "Error: directory '$PREFIX' does not exist at repo root." >&2
  exit 1
fi

echo "Splitting subtree prefix: $PREFIX"
echo "  from branch: $SOURCE_BRANCH"
echo "  into branch: $EXPORT_BRANCH"
echo "(This can take a while on a large repo.)"

git fetch origin "$SOURCE_BRANCH" 2>/dev/null || true
git subtree split -P "$PREFIX" -b "$EXPORT_BRANCH" "$SOURCE_BRANCH"

echo ""
echo "Done. Branch '$EXPORT_BRANCH' contains only '$PREFIX/' history."
echo "Next:"
echo "  git remote add NEWREMOTE https://github.com/YOU/NEWREPO.git"
echo "  git push NEWREMOTE $EXPORT_BRANCH:main"
