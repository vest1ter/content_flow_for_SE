# ContentFlow AI

Сервис генерации маркетингового контента для малого бизнеса с помощью LLM. Пользователь один раз описывает свой бизнес (сфера, регион, стиль общения), а сервис:

- пишет пост под цель (продажи, вовлечённость, узнаваемость) и тон;
- составляет контент-план на N дней;
- находит самые просматриваемые посты Telegram-канала и пишет новый пост по их мотивам.

Архитектура: React → API Gateway (Go, REST) → gRPC-сервисы на Python (auth, business, content) + PostgreSQL, Redis, RabbitMQ, MinIO. Подробности — в [docs/00-project.md](docs/00-project.md).

## Документация

| Документ | Содержание |
|---|---|
| [docs/00-project.md](docs/00-project.md) | Паспорт, структура, карта функций, журнал запуска, план на семестр |
| [docs/legacy/](docs/legacy/) | Исходная документация команды: REST и gRPC API, сеть Docker |
| [docs/pm/](docs/pm/) | Презентация продукта и фич-лист |
| [CHANGELOG.md](CHANGELOG.md) | История изменений |

## Запуск

### Предварительные требования

| Инструмент | Версия, на которой проверено |
|---|---|
| Docker Engine | 27.2 |
| Docker Compose | v2.29 |
| Git | 2.39 |
| Python (только для проверки) | 3.10+ (проверено на 3.13) |

Свободные порты: 3000, 8080, 5432–5434, 5672, 15672, 6379, 9000, 9001, 50051–50053. Если порт занят, поменяйте его в `.env` до запуска (например, `API_GATEWAY_PORT=8081`: фронтенд и `smoke_test.py` подхватят новый порт). Около 5 ГБ места под образы.

Версии зафиксированы: Python-сервисы — `poetry.lock` (Python 3.13 в образах), API Gateway — `go.sum` (Go 1.25 в образе сборки, `go 1.24.5` в `go.mod`), фронтенд — `package-lock.json` (Node 22 в образе сборки), образы инфраструктуры — точные теги в `docker-compose.yml`.

### Установка и запуск

```bash
git clone <url-репозитория> contentflow && cd contentflow
cp .env.example .env
docker compose up -d --build
python scripts/smoke_test.py
```

Первая сборка занимает 5–15 минут (скачивание образов и зависимостей). После запуска:

- интерфейс — http://localhost:3000
- REST API — http://localhost:8080/api/v1
- RabbitMQ — http://localhost:15672, MinIO — http://localhost:9001

Остановка: `docker compose down` (с удалением данных: `docker compose down -v`).

### Демо-режим и внешние сервисы

По умолчанию `.env.example` включает демо-режим, чтобы проект запускался без ключей:

| Переменная | Демо | Реальный режим |
|---|---|---|
| `APP_CONFIG__ML__MOCK` | `true`: тексты генерирует заглушка `MockLLMClient` | `false` + ключ `APP_CONFIG__ML__OPENROUTER_API_KEY` с https://openrouter.ai/keys |
| `APP_CONFIG__TELEGRAM__MOCK` | `true`: анализ канала возвращает тестовые посты | `false` + `API_ID`/`API_HASH` с https://my.telegram.org (нужна авторизованная сессия, см. issues) |
| `RABBITMQ_CONFIG__SMTP__MODE` | `console`: код подтверждения пишется в лог | `smtp` + данные SMTP (для Gmail — пароль приложения) |

Код подтверждения email в демо-режиме:

```bash
docker compose logs rabbit_worker | grep verification_code
```

### Проверка работоспособности

`python scripts/smoke_test.py` проходит основной сценарий через REST API:

1. регистрирует пользователя и подтверждает email кодом из лога `rabbit_worker`;
2. создаёт бизнес;
3. генерирует пост для бизнеса;
4. проверяет, что запрос без токена получает 401.

Ожидаемый вывод заканчивается строкой `Проверка пройдена.` Вручную то же самое: открыть http://localhost:3000 → «Регистрация» → ввести код из лога → «Добавить бизнес» → «Создать пост».

### Протокол проверки запуска

| Дата | ОС | Кто проверял | Способ | Результат |
|---|---|---|---|---|
| 2026-11-02 | Windows 10 Pro 22H2 (build 19045), Docker Desktop 27.2.0, Compose v2.29.2, Python 3.13.5 | Павел Григорьев | `cp .env.example .env` (порт gateway изменён на 8081 — 8080 занят), `docker compose up -d --build`, `python scripts/smoke_test.py` | Все 13 контейнеров запущены, smoke-тест пройден; UI открывается на http://localhost:3000 |

Проверку на машине другого участника или в чистой ВМ нужно выполнить по этой инструкции и добавить строку в таблицу.

## Работа с репозиторием

- Каждая лабораторная работа — ветка `lab-N`, слияние в `main` только через pull request, на итоговый коммит ставится тег `lab-N`.
- Идентификаторы: FR-n, NFR-n, US-n (требования и сценарии), CR-n (запросы на изменение), T-n (тесты). Указываются в коммитах, issues и PR.
- Метки issues: `review`, `bug`, `change-request`, `question`. Настройка меток, защиты `main` и стартовых issues: `REPO=owner/name bash scripts/github_setup.sh`.

### Синхронизация с исходным репозиторием

Проект начат от https://github.com/vest1ter/content_flow_for_SE (ветка `master`). Чтобы забрать изменения оттуда:

```bash
git remote add upstream https://github.com/vest1ter/content_flow_for_SE.git   # один раз
git fetch upstream
git checkout -b sync-upstream main
git merge upstream/master        # код в upstream лежит в корне, у нас — в src/: конфликты переноса решаются вручную
```

Изменения вливаются в `main` через pull request, как и любые другие.

## Лицензия

[MIT](LICENSE)
