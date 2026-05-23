# e-PTW (инфраструктура нагрузочного теста)

Код **продукта** e-PTW по [docs/TZ_e-PTW_Firebase_v1.0.md](../docs/TZ_e-PTW_Firebase_v1.0.md) в этом репозитории не ведётся; здесь — **то, что можно прогнать сегодня**: мок HTTP API + сценарии [k6](https://k6.io).

## 1. Установить k6

- macOS: `brew install k6`
- Или: см. [k6 install](https://k6.io/docs/getting-started/installation/)

## 2. Поднять мок (локально)

```bash
cd e-ptw/mock-server
node server.mjs
# слушает PORT (по умолчанию 9099)
```

## 3. Нагрузочный прогон

В другом терминале, из **корня** репозитория (или `e-ptw/loadtest`):

```bash
export BASE_URL=http://127.0.0.1:9099
k6 run e-ptw/loadtest/k6/health-stages.js
k6 run e-ptw/loadtest/k6/nd-mixed.js
```

Переменные (опционально):
- `BASE_URL` — URL мока или **staging** API, когда появится.
- `K6_VUS` — максимальное VU (по умолчанию в сценарии ~200, см. файл).

## 4. Дальше

- Замените `BASE_URL` на **реальный** staging; допишите в `k6/nd-mixed.js` **реальные** пути и `POST`-тела (создание наряда, согласование).
- Для Firebase без HTTP-фасада нагрузку на Firestore моделируют **отдельно** (эмклятор, скрипты) — см. [../docs/e-ptw-load-test-plan.md](../docs/e-ptw-load-test-plan.md).
