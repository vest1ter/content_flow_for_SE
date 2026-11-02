#!/usr/bin/env bash
# Настройка репозитория на GitHub по правилам курса (ЛР1, задачи 1, 2, 4).
# Требуется: gh (https://cli.github.com) с выполненным `gh auth login`, права администратора репозитория.
# Запуск из корня репозитория:  REPO=owner/name bash scripts/github_setup.sh
set -euo pipefail

REPO="${REPO:?укажите REPO=owner/name}"

echo "== Метки"
gh label create review         --repo "$REPO" --color 0E8A16 --description "Замечание ревьюера" --force
gh label create bug            --repo "$REPO" --color D73A4A --description "Ошибка" --force
gh label create change-request --repo "$REPO" --color FBCA04 --description "Запрос на изменение (CR-n)" --force
gh label create question       --repo "$REPO" --color 0075CA --description "Вопрос или наблюдение" --force

echo "== Защита ветки main (только через pull request, 1 одобрение)"
gh api -X PUT "repos/$REPO/branches/main/protection" --input - <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null
}
JSON

echo "== Issue product"
gh issue create --repo "$REPO" --title "product: ContentFlow AI — паспорт проекта" --body "$(cat <<'MD'
**ContentFlow AI** — сервис генерации маркетингового контента для малого бизнеса с помощью LLM.

- Происхождение: собственный проект команды (исходный репозиторий https://github.com/vest1ter/content_flow_for_SE, коммит 2b7afd5).
- Роли: Пользователь (владелец бизнеса / SMM); внешние системы — OpenRouter (LLM), Telegram API, SMTP.
- Основные функции: генерация поста для бизнеса; генерация контент-плана; анализ Telegram-канала и пост по мотивам популярных публикаций.
- Сущности: Пользователь, Бизнес, Пост, Контент-план, Пункт контент-плана.
- Стек: React, Go (API Gateway), Python gRPC-сервисы, PostgreSQL, Redis, RabbitMQ, MinIO, Docker Compose.
- Лицензия: MIT.

Паспорт: docs/00-project.md. Issue остаётся открытым до согласования плана на семестр (ЛР1, задача 5).
MD
)"

echo "== Issues по результатам разбора (ЛР1, задача 4)"
issue() { gh issue create --repo "$REPO" --label "$1" --title "$2" --body "$3"; }

issue bug "Пароли и коды подтверждения пишутся в логи" \
"auth_service/server.py при несовпадении паролей логирует оба пароля открытым текстом (\`пароли не совпадают: {password} | {repeat_password}\`), а при отправке и проверке кодов — сам код. API Gateway логирует сырое тело запроса /auth/confirm. Любой, у кого есть доступ к логам, получает пароли и коды.

Ожидается: секреты не попадают в логи, уровень по умолчанию — INFO."

issue bug "rabbit_worker бесконечно переотправляет письмо при ошибке SMTP" \
"tasks/email.py возвращает False при любой ошибке (MX-запись, авторизация SMTP), а main.py делает \`basic_nack(requeue=True)\`. Сообщение возвращается в очередь и обрабатывается снова без задержки и ограничения попыток — бесконечный цикл и нагрузка на SMTP.

Ожидается: ограниченное число повторов с задержкой или dead-letter очередь."

issue bug "Неверный код подтверждения возвращает 500 вместо 400" \
"auth_service ConfirmVerifyCode при несовпадении или истечении кода ставит \`StatusCode.INTERNAL\`; gateway превращает его в HTTP 500 «internal server error». Пользователь не понимает, что ошибся в коде. Для сброса пароля (ConfirmPasswordResetCode) используется INVALID_ARGUMENT — поведение несогласованно.

Ожидается: 400 с сообщением «Неверный код подтверждения»."

issue bug "Gateway отдаёт 500 на ошибки валидации и лимитов" "Обработчики handleGenerateBusinessPost, handleGenerateContentPlan и handleCreateBusiness отвечают HTTP 500 на любую ошибку gRPC, не глядя на код статуса. Проверено на демо-стенде:
- пустое описание поста → 500 «failed to generate business post» (сервис возвращает INVALID_ARGUMENT);
- period_days = 0 → 500 «failed to generate content plan»;
- третий бизнес → 500 «failed to create business» (лимит 2).

Ожидается: INVALID_ARGUMENT → 400, лимит → 409/400 с понятным сообщением (FR-4, FR-8, FR-9)."

issue question "Получение контент-плана сделано через POST /content/plan/:id" \
"В src/api-gateway/internal/controller/http.go операция чтения GetContentPlan зарегистрирована как \`POST /content/plan/:id\`. Это нарушает семантику HTTP (нельзя кэшировать, неочевидно для клиентов). Предлагается \`GET /content/plan/:id\` с сохранением старого маршрута на переходный период."

issue question "Реальный режим Telegram не работает в контейнере" \
"utils/telegram_client.py вызывает \`TelegramClient.start()\` с сессией 'telegram_session' в рабочей папке контейнера. Без готовой сессии Telethon запрашивает номер телефона через stdin, что в контейнере невозможно; сессия не сохраняется между пересборками. Нужен отдельный скрипт авторизации и volume для файла сессии."

issue question "Нет автотестов, линтеров и CI" \
"В проекте нет pytest-тестов (ML/test_integration.py ходит в настоящий OpenRouter), нет линтеров (ruff, golangci-lint) и workflow GitHub Actions. Планируется закрыть в ЛР по тестированию; issue — для отслеживания."

issue question "Расхождение фич-листа и кода: вход по email и платформа VK" \
"Фич-лист (docs/pm/feature-list-and-scenarios.docx) требует «вход только по email» и выбор платформы Telegram/VK. В коде вход возможен и по username (LoginUser ищет по username, если нет @), а платформа зашита как Telegram. Нужно решение: правим код или требования (зафиксировать в ЛР2)."

issue question "Дублирование utils/JWT.py в трёх сервисах и общий секрет" \
"Файл utils/JWT.py скопирован в auth_service, business_service и content_service с расхождениями; все три проверяют токен общим секретом HS256. Изменение формата токена нужно делать в трёх местах. Варианты: общий пакет или проверка токена только через AuthService.ValidateToken в gateway."

echo "Готово."
