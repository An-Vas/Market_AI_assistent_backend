## Бекенд-часть приложения AI ассистента для интернет-магазина
### Развертывание

Условия: должны быть установлены node, typescript, npm
```
git clone https://github.com/An-Vas/Market_AI_assistent_backend.git
cd Market_AI_assistent_backend
npm i 
cp .env.example .env
npm run dev
```

Для проверки, что сервис запустился, можно открыть в браузере http://localhost:5005/hello, должен возвратиться ответ hello.
При необходимости изменить порт, на котором развернут сервер или изменить адрес МЛ-апи - изменить соответствующие параметры в сгенерированном .env файле.

### Запуск backend через Docker Compose

Из каталога `Market_AI_assistent_backend` запустите backend:

```powershell
docker compose up -d --build
```

Backend будет доступен только на localhost по адресу `http://127.0.0.1:5005`.
Backend обращается к ML API, работающему на хост-компьютере на порту 8000,
по адресу `http://host.docker.internal:8000`. Убедитесь, что ML API запущен и
доступен с хоста на порту 8000 перед отправкой запросов через backend.

При необходимости сбросить все внесенные в базу данных изменения можно удалить файл database.sqlite в корне репозитория и перезапустить сервер. Стартовые данные в базе данных включают в себя 4 заказа на идентификаторы пользователей 5, 6, 7. 


```
{ orderComposition: '1 red book', status: 'created', deliveryDate: new Date(), userId: '5' },
{ orderComposition: 'white table lamp', status: 'created', deliveryDate: new Date(), userId: '6' },
{ orderComposition: 'plates with cat pictures', status: 'delivered', deliveryDate: new Date(), userId: '7' },
{ orderComposition: 'pillow', status: 'created', deliveryDate: new Date(), userId: '7' }
```

Для ответов AI также запустите локальный FastAPI ML-сервис и Ollama. (Подробности в репозитории [ai-assistant](https://gitlab.com/Elitra/ai-assistant))

Для запросов о заказах backend попросит `orderId`; прочие ответы генерирует Ollama из подходящей статьи базы знаний. `sessionId` — внешний ID сессии. Для доступа к заказу `userId` должен совпадать с его владельцем.

### Использование бека: 
Бек поддерживает два запроса.
Первый запрос (для теста успешного развертывания):

`GET http://localhost:5005/hello ` 

Ответ: hello

Второй запрос (для использования пользователем): 

`POST http://localhost:5005/support`

Тело запроса: 
```
{
    "message" : "some usual tet wtith same mistaks",
    "sessionId": 8,
    "userId": 1,
    "orderId": 1
}
```
Параметр orderId необязательный. Указывать его можно, но учитываться он будет только в категориях где эта информация нужна. Если заказ принадлежит другому пользователю придет снова сообщение "укажите или перепроверьте номер заказа" (на английском).

### Тестирование и отчёты

Есть два набора автотестов и, соответственно, два отдельных Allure-отчёта (третий — у фронтенда, см. README `ai-assistent-frontend`):

| Набор | Запуск без отчёта | Запуск + Allure-результаты | Сборка HTML-отчёта | Открыть отчёт |
|---|---|---|---|---|
| Обычные + атакующие проверки на моке модели | `npm test` | `npm run test:allure` | `npm run report:allure` | `npm run open:allure` |
| Атакующие проверки против реальной LLM (red-team) | `npm run test:redteam` | `npm run test:redteam:allure` | `npm run report:redteam:allure` | `npm run open:redteam:allure` |

Red-team-прогону нужен реально поднятый `ai-assistant` (FastAPI + Ollama + knowledge_db) по адресу из `FASTAPI_HOST` — если он недоступен, тесты сами помечаются skipped, а не падают.

`npm run open:allure` / `open:redteam:allure` поднимают локальный HTTP-сервер и открывают браузер (`Allure is running on http://localhost:XXXXX`). Открыть `index.html` напрямую через `file://` не получится — отчёту нужен HTTP, он подгружает данные через fetch. Отчёт остаётся на диске (`allure-report-backend/`, `allure-report-redteam/`, в `.gitignore`) — `open:*` можно запускать позже сколько угодно раз без повторного прогона тестов, он просто сервит то, что уже сгенерировано.

**Как в отчёте отличить атакующие проверки от обычных:** все названия тестов — на русском. Все 22 атакующие проверки из плана тестирования безопасности названы с префиксом `строка N:` (например, `строка 4: пользователь Б не может читать или писать в сессию пользователя А по её sessionId`, или `строка 8: проверка владения заказом даёт одинаковый ответ для чужого и несуществующего заказа`). В дереве Suites/Packages отчёта они сгруппированы по файлу теста: большинство — в `tests/security.test.ts` (там одна родительская проверка с 10 подпроверками-строками), ещё одна — в `tests/backend.test.ts`. Остальные файлы (`auth.test.ts`, `controller.test.ts`, `database.test.ts`, `session.test.ts`, и большая часть `backend.test.ts`) — обычные функциональные тесты, не из списка атак. Быстрее всего — ввести `строка` в поиск по тестам в самом отчёте.

### Trace ID и логи

Каждый запрос получает trace ID — либо из заголовка `X-Trace-Id` (если
клиент его передал), либо сгенерированный сервером. Он возвращается в
заголовке ответа `X-Trace-Id` и используется во всех логах этого запроса,
включая вызовы ML-сервиса и marketplace-mock (заголовок прокидывается дальше
в `/assistant/*` и `/api/orders*`). Это позволяет найти в логах всех трёх
сервисов события одного конкретного запроса.

Логи — одна JSON-строка на важное событие (через `log()` в
`src/api/common/trace.ts`): `timestamp`, `level`, `service`, `trace_id`,
`app_version`, `message`, плюс контекстные поля там, где они осмысленны —
`action` (`sso_login_verify`, `orders_request`, `support_request`,
`frontend_error`), `authz_result` (`allowed`/`denied`), `user_id`. Пароли,
токены и `Authorization`-заголовки в логи никогда не попадают.

`GET /metrics` отдаёт Prometheus-метрики (`http_requests_total`,
`auth_failures_total` — счётчик отклонённых SSO-токенов, на нём строится
алерт на подозрительную активность). `POST /logs/frontend` принимает
`{traceId, message, stack?, url?}` от фронтенда без авторизации и пишет как
`service: "frontend"` — так ошибки браузера попадают в тот же лог-пайплайн.

Полная схема агрегации (Grafana+Loki+Prometheus) — в корневом `MONITORING.md`.
