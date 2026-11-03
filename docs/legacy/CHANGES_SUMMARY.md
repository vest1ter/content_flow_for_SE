# Сводка изменений для API Gateway

## Исправленные неточности

### 1. Proto файлы

#### Auth Service (`protobufs/auth.proto`)
- ✅ Добавлен `package auth.v1;`
- ✅ Добавлен `option go_package = "gen/auth/v1;authv1";`
- ✅ Добавлены комментарии к сервису

#### Content Service (`protobufs/content.proto`)
- ✅ Добавлен `package content.v1;`
- ✅ Добавлен `option go_package = "gen/content/v1;contentv1";`
- ✅ Добавлены комментарии к сервису

#### Business Service (`protobufs/business.proto`)
- ✅ Уже имел правильные package и go_package опции

### 2. Консистентность

Все сервисы теперь имеют:
- Единый формат package: `{service}.v1`
- Единый формат go_package: `gen/{service}/v1;{service}v1`
- Комментарии к сервисам

### 3. Важные замечания

1. **Порты:** Все сервисы слушают на порту `50051` внутри Docker сети
2. **Аутентификация:** Все методы (кроме RegisterUser и LoginUser) требуют `access_token`
3. **UUID:** Всегда передаются как строки
4. **Даты:** Всегда Unix timestamp (int64)
5. **Лимиты:** Максимум 2 бизнеса на пользователя
6. **Платформа:** Фиксированно Telegram для всех постов

### 4. Рекомендации для разработчика API Gateway

1. Используйте `ValidateToken` для проверки токенов перед вызовом других методов
2. Для `GenerateBusinessPost` сначала получите активный бизнес через `GetActiveBusiness` из Business Service
3. Всегда обрабатывайте gRPC статус коды ошибок
4. Используйте правильные имена сервисов в Docker сети: `auth-service:50051`, `business-service:50051`, `content-service:50051`

## Следующие шаги

1. Перегенерируйте proto файлы для всех сервисов:
```bash
# Auth Service
python -m grpc_tools.protoc -I protobufs --python_out=auth_service/generated_proto --grpc_python_out=auth_service/generated_proto protobufs/auth.proto

# Business Service
python -m grpc_tools.protoc -I protobufs --python_out=business_service/generated_proto --grpc_python_out=business_service/generated_proto protobufs/business.proto

# Content Service
python -m grpc_tools.protoc -I protobufs --python_out=content_service/generated_proto --grpc_python_out=content_service/generated_proto protobufs/content.proto
```

2. Для Go API Gateway используйте:
```bash
protoc --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  protobufs/*.proto
```

3. Изучите `API_SPECIFICATION.md` для подробной документации всех методов
