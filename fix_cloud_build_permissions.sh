#!/bin/bash
# Исправление прав Cloud Build service account для деплоя Cloud Functions 2nd Gen
# Использование: ./fix_cloud_build_permissions.sh [PROJECT_ID] [PROJECT_NUMBER]

set -e

PROJECT_ID="${1:-$(firebase use 2>/dev/null | grep -oE '\* [a-z0-9-]+' | cut -d' ' -f2)}"
PROJECT_NUMBER="${2:-763352131605}"

if [ -z "$PROJECT_ID" ]; then
  echo "Укажите Project ID: ./fix_cloud_build_permissions.sh YOUR_PROJECT_ID [PROJECT_NUMBER]"
  echo "Project Number можно взять из ошибки деплоя (project=XXXX в URL логов)"
  exit 1
fi

echo "=== Исправление прав для проекта: $PROJECT_ID (number: $PROJECT_NUMBER) ==="

# Cloud Build SA
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
# Compute Engine default SA (для новых проектов)
CE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SA in "$CB_SA" "$CE_SA"; do
  echo ""
  echo "Выдача прав для $SA ..."
  
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA}" \
    --role="roles/cloudbuild.builds.builder" \
    --quiet 2>/dev/null || true

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA}" \
    --role="roles/storage.objectAdmin" \
    --quiet 2>/dev/null || true

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA}" \
    --role="roles/logging.logWriter" \
    --quiet 2>/dev/null || true
done

echo ""
echo "=== Готово. Повторите: firebase deploy --only functions ==="
