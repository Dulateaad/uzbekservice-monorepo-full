# Исправление: Build failed — missing permission on the build service account

## Проблема

При деплое Cloud Functions (2nd Gen) возникает ошибка:
```
Build failed with status: FAILURE. Could not build the function due to a missing permission 
on the build service account.
```

Это связано с изменениями в Cloud Build (2024): новые проекты используют другой service account, которому могут не хватать прав.

## Решение

### 1. Узнайте Project ID и Project Number

```bash
# Текущий проект Firebase
firebase use

# Project Number (числовой ID) — смотрите в Firebase Console → Project Settings
# Или через gcloud:
gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)'
```

В вашей ошибке project number: **763352131605**

### 2. Выдайте права Cloud Build service account

Выполните в терминале (замените `YOUR_PROJECT_ID` на ваш Firebase Project ID, например `odo-business-hub` или `asterautonew`):

```bash
# Установите проект
export PROJECT_ID="YOUR_PROJECT_ID"
export PROJECT_NUMBER="763352131605"

# 1. Cloud Build Service Account (основной аккаунт для сборки)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# 2. Storage Object Admin (загрузка артефактов сборки)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# 3. Logs Writer (логирование)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# 4. Если используется Compute Engine default SA (новые проекты)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### 3. Включите нужные API

```bash
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
```

### 4. Повторите деплой

```bash
firebase deploy --only functions
```

## Альтернатива: через Google Cloud Console

1. Откройте [IAM & Admin](https://console.cloud.google.com/iam-admin/iam)
2. Выберите ваш проект
3. Найдите `763352131605@cloudbuild.gserviceaccount.com` (Cloud Build Service Account)
4. Нажмите карандаш (Edit)
5. Добавьте роли:
   - **Cloud Build Service Account**
   - **Storage Object Admin**
   - **Logs Writer**

## Если проект в организации (Organization)

Организационные политики могут ограничивать права. Проверьте:
- [Organization Policy](https://console.cloud.google.com/iam-admin/orgpolicies)
- Свяжитесь с администратором GCP, если не можете выдать роли

## Ссылки

- [Cloud Build Service Account](https://cloud.google.com/build/docs/securing-builds/configure-access-for-cloud-build-service-account)
- [Cloud Functions troubleshooting](https://cloud.google.com/functions/docs/troubleshooting#build-service-account)
