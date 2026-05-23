# Отдельный репозиторий для подпроекта (из монорепо)

Монорепозиторий `uzbekservice_app` можно разрезать так, чтобы **одна папка** стала **своим Git-репозиторием** с сохранением истории коммитов, затрагивающих эту папку.

## Вариант A — с историей (`git subtree split`)

Подходит для: `kira-ai-final/`, `peoplehub/`, `verdict-app/` и т.д.

1. В корне монорепо выполните (пример для KIRA):

   ```bash
   ./scripts/split-subproject-repo.sh kira-ai-final main kira-export
   ```

2. Создайте **пустой** репозиторий на GitHub (без README, без .gitignore).

3. Подключите remote и запушьте ветку экспорта как `main` нового репо:

   ```bash
   git remote add kira https://github.com/YOU/kira-ai.git
   git push kira kira-export:main
   ```

4. Клонируйте уже «чистый» репозиторий и работайте только в нём:

   ```bash
   git clone https://github.com/YOU/kira-ai.git
   ```

**Важно:** первый запуск `subtree split` на большом монорепо может занять много времени и места на диске.

## Вариант B — без истории (быстро)

Если история в монорепо не нужна:

```bash
mkdir ../kira-ai-standalone && rsync -a --exclude node_modules --exclude .next \
  kira-ai-final/ ../kira-ai-standalone/
cd ../kira-ai-standalone
git init
git add .
git commit -m "Initial import from uzbekservice_app monorepo"
git branch -M main
git remote add origin https://github.com/YOU/kira-ai.git
git push -u origin main
```

## PeopleHub + бот

Если нужен один репозиторий «такси»:

- включите в новый репо папки `peoplehub/` и `peoplehub-bot/` (два subtree split и merge в один репо — сложнее), **или**
- держите два репозитория: `peoplehub` (клиент + functions) и `peoplehub-bot`.

## После выноса

- В монорепо: либо **удалите** папку и переходите только на новый репо, либо оставьте **git submodule** на новый URL (если хотите, чтобы корневой репо продолжал ссылаться на проект).
