# Журнал изменений

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [lab-1] — 2026-11-02

### Добавлено
- Паспорт проекта, структура, карта функций, состояние практик, журнал запуска, риски и план на семестр (`docs/00-project.md`).
- README с разделом «Запуск»; `LICENSE` (MIT); структура каталогов курса (`docs/`, `src/`, `tests/`).
- Единый `.env.example` и демо-режим без внешних ключей: `MockLLMClient`, `MockTelegramChannelAnalyzer`, вывод кода подтверждения в лог `rabbit_worker`.
- Сервис `frontend` в docker compose (сборка React + nginx).
- Проверка работоспособности `scripts/smoke_test.py`; скрипт настройки GitHub `scripts/github_setup.sh`.

### Изменено
- Исходный код перенесён в `src/`, папка фронтенда переименована в `src/frontend`, исходная документация — в `docs/legacy/`.
- Образ MinIO заменён на `bitnamilegacy/minio:2025.7.23` (образ `minio/minio` удалён с Docker Hub); версии RabbitMQ и Redis закреплены.

### Исправлено
- Сборка Python-сервисов больше не требует отдельного `.env` в каждой папке.
- `rabbit_worker` получает переменные окружения; `auth-service` ждёт готовности Redis и RabbitMQ.
- Рассинхронизированный `package-lock.json` фронтенда; healthcheck RabbitMQ проверяет порт AMQP.
- Адрес API во фронтенде задаётся при сборке из `API_GATEWAY_PORT` (раньше был зашит `localhost:8080`).
