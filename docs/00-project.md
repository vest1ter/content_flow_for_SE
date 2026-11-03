# Паспорт проекта ContentFlow AI

## 1. Паспорт

| Поле | Значение |
|---|---|
| Название | ContentFlow AI |
| Происхождение | Собственный проект команды. Исходный репозиторий: https://github.com/vest1ter/content_flow_for_SE, коммит `2b7afd5` («initial commit»), от которого начата работа по курсу |
| Назначение | Сервис для владельцев малого бизнеса и SMM-специалистов, который с помощью LLM генерирует маркетинговый контент: посты, контент-планы и посты по мотивам популярных публикаций Telegram-канала |
| Решаемая проблема | Регулярное ведение соцсетей требует времени и навыков копирайтинга. Малый бизнес не может держать SMM-специалиста, а универсальные чат-боты не знают контекста бизнеса и каждый раз требуют его заново. ContentFlow хранит профиль бизнеса (сфера, регион, стиль общения) и подставляет его во все генерации |
| Целевые пользователи и роли | **Пользователь** — владелец бизнеса или SMM-специалист, ведёт до 2 бизнесов. **Внешние системы:** LLM-провайдер OpenRouter, Telegram API, почтовый SMTP-сервер |
| Три основные функции | 1) Генерация поста для бизнеса по описанию, цели и тону. 2) Генерация контент-плана на N дней. 3) Анализ Telegram-канала и генерация поста по самым просматриваемым публикациям |
| Технологический стек | Frontend: React 18 (CRA, JavaScript). API Gateway: Go 1.24, Echo. Сервисы: Python 3.13, gRPC, SQLAlchemy 2, pydantic-settings. Хранилища: PostgreSQL 15 (база на каждый сервис), Redis 7, MinIO (S3). Очередь: RabbitMQ 3.13. LLM: OpenRouter (mistral-7b-instruct). Telegram: Telethon. Развёртывание: Docker Compose |
| Лицензия | MIT (файл [LICENSE](../LICENSE)) |
| Команда | Григорьев Павел Алексеевич — ML-разработчик (`content_service/ML`: промпты, пайплайны генерации, клиент LLM). Мякишев Владислав Дмитриевич — backend-разработчик (API Gateway, сервисы auth, business, content, docker compose) |

Материалы продукта (презентация и фич-лист) лежат в [docs/pm/](pm/).

## 2. Структура проекта

```
.
├── docker-compose.yml      # запуск всей системы
├── .env.example            # единый файл конфигурации (демо-режим по умолчанию)
├── scripts/smoke_test.py   # проверка работоспособности
├── src/
│   ├── frontend/           # React SPA (страницы: вход, бизнесы, пост, контент-план, Telegram)
│   ├── api-gateway/        # Go: REST API /api/v1 → gRPC-клиенты сервисов
│   ├── auth_service/       # Python gRPC: пользователи, JWT, коды подтверждения
│   ├── business_service/   # Python gRPC: профили бизнесов, логотипы
│   ├── content_service/    # Python gRPC: генерация контента, Telegram
│   │   └── ML/ml_core/     # промпты, клиент LLM, пайплайны генерации
│   ├── rabbit_worker/      # Python: отправка писем с кодами из очереди
│   └── protobufs/          # gRPC-контракты auth / business / content
├── docs/                   # документация курса; docs/legacy — исходная документация команды
└── tests/                  # тесты (появятся в ЛР по тестированию)
```

### Точки входа

| Компонент | Точка входа | Порт (хост) |
|---|---|---|
| Frontend | `src/frontend/src/index.js` (в контейнере собирается и отдаётся nginx) | 3000 |
| API Gateway | `src/api-gateway/cmd/app/main.go` | 8080 |
| Auth Service | `src/auth_service/server.py` | 50051 |
| Content Service | `src/content_service/server.py` | 50052 |
| Business Service | `src/business_service/server.py` | 50053 |
| Почтовый воркер | `src/rabbit_worker/src/main.py` | — |

### Внешние зависимости и сервисы

| Зависимость | Кто использует | Зачем |
|---|---|---|
| PostgreSQL ×3 | auth, business, content | Пользователи; бизнесы; посты и контент-планы |
| Redis | auth | Коды подтверждения email и сброса пароля (TTL 300 с) |
| RabbitMQ | auth → rabbit_worker | Очередь `email_codes` для отправки писем |
| MinIO (S3) | business, content | Логотипы бизнесов, файлы постов |
| OpenRouter API | content | Генерация текстов LLM (платный ключ) |
| Telegram API | content | Чтение постов каналов (API_ID/API_HASH и авторизованная сессия) |
| SMTP | rabbit_worker | Отправка писем |

### Хранение данных

Своя база PostgreSQL у каждого сервиса. Таблицы создаются при старте через `Base.metadata.create_all`, миграций нет.
- `users` (auth): id, username, email, hashed_password, confirmed, created_at.
- `businesses` (business): id, user_id, name, industry, audience_reach, region, description, logo_url, communication_style, is_active, created_at, updated_at.
- `posts` (content): id, user_id, business_id, post_type, platform, post_text, goal, tone, description, source_data (JSON), даты.
- `content_plans` (content): id, user_id, business_id, goal, total_posts, period_days, description, items (JSON), даты.

Связи между базами логические: `user_id` и `business_id` передаются в JWT и gRPC-запросах, внешних ключей между базами нет.

### Конфигурация

- Корневой `.env` (шаблон — `.env.example`) читается docker compose и передаётся контейнерам через `env_file`.
- Python-сервисы читают переменные с префиксом `APP_CONFIG__` и разделителем `__` (pydantic-settings). Например, `APP_CONFIG__JWT__SECRET_KEY` попадает в `settings.jwt.secret_key`.
- Строка подключения к БД (`APP_CONFIG__DB__URL`) своя у каждого сервиса и собирается в `docker-compose.yml`.
- Почтовый воркер использует префикс `RABBITMQ_CONFIG__`.
- API Gateway читает адреса сервисов из `src/api-gateway/config.json`.
- Флаги демо-режима: `APP_CONFIG__ML__MOCK`, `APP_CONFIG__TELEGRAM__MOCK`, `RABBITMQ_CONFIG__SMTP__MODE=console`.

## 3. Карта функций

Все запросы идут на `http://localhost:8080/api/v1`. Защищённые запросы передают заголовок `Authorization: Bearer <access_token>`.

| Функция | Реализация | Как проверить вручную |
|---|---|---|
| Регистрация и подтверждение email | gateway `handleRegisterUser`, `handleConfirmVerifyCode`; auth `RegisterUser`, `SendVerifyCode`, `ConfirmVerifyCode`; `rabbit_worker/src/tasks/email.py` | UI: «Регистрация» → код из `docker compose logs rabbit_worker` → ввести код → открывается дашборд |
| Вход и обновление токена | gateway `handleLoignUser`, `handleRefreshUserToken`; auth `LoginUser`, `RefreshUserToken` | UI: «Вход» по email или имени пользователя → дашборд; `POST /auth/refresh` с refresh_token возвращает новый access_token |
| Восстановление пароля | gateway `handleSendPasswordResetCode`, `handleConfirmPasswordResetCode`, `handleResetPassword`; auth одноимённые RPC; UI `RecoveryPasswordPage.jsx` | UI: «Забыли пароль?» → код из лога воркера → новый пароль → вход с новым паролем |
| Создание, редактирование, удаление бизнеса | gateway `handleCreateBusiness`, `handleUpdateBusinessByID`, `handleDeleteBusinessByID`; business `CreateBusiness`, `UpdateBusiness`, `DeleteBusiness`; UI `CreateBusinessPage.jsx`, `ManagementBusinessPage.jsx` | UI: «Добавить бизнес» → бизнес появляется в списке; третий бизнес не создаётся (лимит 2) |
| Переключение активного бизнеса | gateway `handleSetActiveBusiness`, `handleGetActiveBusiness`; business `SetActiveBusiness` | UI: выбрать бизнес в шапке → `GET /business/active` возвращает выбранный |
| Генерация поста для бизнеса | gateway `handleGenerateBusinessPost`; content `GenerateBusinessPost`; `ml_core/pipelines/content_generation.py` | UI: «Создать пост» → описание, цель, тон → появляется текст поста |
| Генерация контент-плана | gateway `handleGenerateContentPlan`, `handleGetContentPlan`; content `GenerateContentPlan`, `GetContentPlan` | UI: «Контент-план» → цель, количество идей, срок → список идей с датами |
| Анализ Telegram-канала | gateway `handleAnalyzeTelegramChannel`; content `AnalyzeTelegramChannel`; `utils/telegram_client.py` | UI: «Анализ Telegram» → имя канала и период → топ-5 постов по просмотрам |
| Генерация поста по постам Telegram | gateway `handleGeneratePostFromTelegramPosts`; content `GeneratePostFromTelegramPosts`; `ml_core/pipelines/telegram_analysis.py` | UI: отметить посты в результатах анализа → «Сгенерировать» → новый пост |

Автоматическая проверка основного сценария: `python scripts/smoke_test.py`.

## 4. Состояние практик

| Практика | Есть? | Комментарий |
|---|---|---|
| Автотесты | Нет | Есть только `content_service/ML/test_integration.py`: ручной скрипт с запросами к настоящему OpenRouter, не pytest |
| Smoke-проверка | Да (добавлена в ЛР1) | `scripts/smoke_test.py` |
| Линтер и форматтер | Нет | Нет ни ruff/flake8 для Python, ни golangci-lint, ни отдельной конфигурации ESLint (только встроенная в CRA) |
| Непрерывная интеграция | Нет | Нет `.github/workflows` |
| Фиксация зависимостей | Частично | `poetry.lock` у Python-сервисов, `go.sum`, `package-lock.json` есть; в `pyproject.toml` диапазоны версий; образ MinIO был `latest` (исправлено) |
| Контейнеризация | Да | Dockerfile у всех сервисов; frontend добавлен в compose в ЛР1 |
| Документация | Частично | Подробные описания API и gRPC в `docs/legacy/`; не было README, описания запуска и архитектуры |
| Журнал изменений | Нет → да | `CHANGELOG.md` заведён в ЛР1 |
| Миграции БД | Нет | `create_all` при старте; изменение схемы потребует ручных действий |
| Логирование | Да, избыточное | DEBUG-логи по умолчанию, в логи попадают пароли и коды (см. issues) |
| Управление секретами | Частично | `.env` в `.gitignore`, шаблоны `.env.example`; JWT-секрет общий для трёх сервисов |

## 5. Журнал запуска

| # | Проблема | Решение |
|---|---|---|
| 1 | Dockerfile каждого Python-сервиса выполнял `COPY .env .env`: без пяти отдельных `.env` сборка падала, и в «пять команд» запуск не укладывался | Строка удалена, переменные передаются через `env_file` в compose. Один корневой `.env.example` вместо пяти, добавлены `.dockerignore` |
| 2 | `rabbit_worker` в compose не получал переменных окружения и падал на валидации настроек | Добавлен `env_file` |
| 3 | `auth-service` стартовал раньше Redis (не было в `depends_on`) | Добавлена зависимость с `service_healthy` |
| 4 | Образа `minio/minio` больше нет ни на Docker Hub, ни на quay.io (pull access denied); исходный compose не собирается на чистой машине | Используется `bitnamilegacy/minio:2025.7.23` (та же MinIO, версия закреплена) |
| 5 | Для запуска нужны платные или личные ключи: OpenRouter, Telegram API, SMTP | Демо-режим: `MockLLMClient`, `MockTelegramChannelAnalyzer`, вывод кода подтверждения в лог воркера. Включён по умолчанию в `.env.example` |
| 6 | Frontend не входил в compose, папка называлась `content-flow — копия` (неразрывный пробел и кириллица ломают скрипты) | Перенесён в `src/frontend`, добавлены Dockerfile (сборка + nginx) и сервис `frontend` |
| 7 | Сервисы падали, если MinIO ещё не готов (`ensure_bucket` при старте) | `restart: on-failure` для сервисов |
| 8 | `package-lock.json` фронтенда не соответствовал `package.json` (`npm ci`: «Missing: yaml@2.9.1 from lock file») | Lock-файл обновлён командой `npm install --package-lock-only` |
| 9 | `rabbit_worker` падал при старте: healthcheck `rabbitmq-diagnostics ping` проходит раньше, чем открывается порт AMQP 5672 | Healthcheck заменён на `check_port_connectivity`; `restart: on-failure` |
| 10 | Порт 8080 на машине проверки занят другим приложением; адрес API во фронтенде был зашит как `localhost:8080` | Адрес API передаётся во фронтенд при сборке (`REACT_APP_API_URL` из `API_GATEWAY_PORT`), smoke-тест берёт порт из `.env` |
| 11 | Реальный режим Telegram: `TelegramClient.start()` в контейнере запрашивает телефон через stdin и не может авторизоваться | Не решено, оформлено как issue; в демо-режиме не мешает |

## 6. Выполнимость и план

### Риски

| Риск | Тип | Вероятность | Последствия | Снижение |
|---|---|---|---|---|
| Нет оплаченного ключа OpenRouter или лимиты бесплатных моделей | Внешний | Высокая | Генерация не работает на защите | Демо-режим `ML_MOCK`; реальный ключ только для демонстрации |
| Telegram требует авторизованную сессию и номер телефона | Внешний | Высокая | Анализ канала не работает в контейнере | `TELEGRAM_MOCK`; отдельный скрипт авторизации сессии (issue) |
| Исчезновение или изменение публичных образов (как с MinIO) | Внешний | Средняя | Сборка падает на чистой машине | Закреплённые версии образов, проверка запуска перед каждой ЛР |
| Стек из трёх языков (Go, Python, JS) и gRPC | Технический | Средняя | Медленный разбор кода, ошибки при изменении контрактов | Описание архитектуры в ЛР3, генерация кода из `protobufs/` одной командой |
| Тяжёлая сборка: 13 контейнеров, около 4 ГБ образов | Технический | Средняя | Долгий первый запуск, нехватка памяти на слабых машинах | Кэш образов; при необходимости запуск только нужных сервисов |
| LLM возвращает невалидный JSON | Технический | Средняя | Ошибка 500 при генерации | Уже есть `safe_json_parse`; тесты пайплайнов на MockLLMClient |
| Нехватка времени у участников в сессию | Организационный | Средняя | Срыв сроков ЛР | План с запасом, работа короткими PR |
| Код писали разные люди, у кода нет единого владельца | Организационный | Средняя | Сложно вносить изменения | Закрепить владельцев сервисов (таблица команды) |

### План на семестр

Оценка трудозатрат указана на команду. Сокращения: ГП — Григорьев П. А., МВ — Мякишев В. Д.

| ЛР | Что будет сделано на ContentFlow | Кто | Часы |
|---|---|---|---|
| 2. Требования | `docs/01-requirements.md`: FR-1…FR-10, NFR-1…NFR-5, сценарии US-n, диаграммы контекста, вариантов использования, последовательностей, классов и состояний | ГП — требования к генерации (FR-6…FR-9), МВ — FR-1…FR-5, FR-10, NFR, диаграммы | 12 |
| 3. Архитектура | `docs/03-architecture.md` (C4: контекст, контейнеры, компоненты content_service); ADR: микросервисы на gRPC, база на сервис, демо-режим внешних сервисов; устранение дублирования `JWT.py` | МВ — C4, ADR, `JWT.py`; ГП — компоненты ML и ADR демо-режима LLM | 12 |
| 4. Реализация | История постов и контент-планов (FR-10), редактирование и сохранение плана (доработка FR-9), вход только по email (FR-2), исправление issues про логи с секретами | МВ — FR-2, FR-10, issues; ГП — генерация и редактирование плана (FR-9) | 20 |
| 5. Тестирование | pytest для auth, business, content на MockLLMClient и тестовой БД; тесты ml_core; Go-тесты обработчиков gateway; CI в GitHub Actions (линтеры, тесты, сборка образов); `docs/04-testing.md` | МВ — тесты сервисов и gateway, CI; ГП — тесты ml_core | 16 |
| 6. Выпуск | Версия 1.0.0, `docs/05-deployment.md`, публикация образов, инструкция развёртывания на сервере | МВ — развёртывание; ГП — настройка реального режима LLM | 8 |

### Объём семестра

- **Входит:** регистрация, вход и восстановление пароля; управление бизнесами и активный бизнес; генерация поста; контент-план с редактированием и сохранением; анализ Telegram и пост по мотивам; история сгенерированного.
- **Не входит:** генерация изображений, экспорт в PDF/ZIP/Word, фирменные цвета, тарифы и оплата, админ-панель, платформа VK, переработка текста через ИИ.
