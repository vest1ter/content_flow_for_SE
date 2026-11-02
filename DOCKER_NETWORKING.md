# Docker Networking для API Gateway

## Как работают порты в Docker сети

### Проблема: Все сервисы на одном порту?

**Вопрос:** Если все сервисы слушают на порту 50051, как API Gateway различает их?

**Ответ:** В Docker сети каждый контейнер изолирован и имеет свой собственный IP адрес. Docker создает внутреннюю DNS сеть, где каждое имя сервиса резолвится в IP адрес соответствующего контейнера.

### Архитектура сети

```
┌─────────────────────────────────────────────────────────────┐
│              Docker Network (bridge/default)                 │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Gateway Container                   │   │
│  │  (если находится в том же docker-compose)            │   │
│  │                                                       │   │
│  │  Подключения:                                        │   │
│  │  • auth-service:50051    → IP: 172.18.0.2:50051    │   │
│  │  • business-service:50051 → IP: 172.18.0.3:50051    │   │
│  │  • content-service:50051  → IP: 172.18.0.4:50051    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ auth-service │  │business-service│  │content-service│    │
│  │              │  │              │  │              │    │
│  │ IP: 172.18.0.2│  │ IP: 172.18.0.3│  │ IP: 172.18.0.4│    │
│  │ Port: 50051   │  │ Port: 50051   │  │ Port: 50051   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Как это работает

1. **Каждый контейнер изолирован:**
   - `auth-service` контейнер слушает на порту 50051 **внутри своего контейнера**
   - `business-service` контейнер слушает на порту 50051 **внутри своего контейнера**
   - `content-service` контейнер слушает на порту 50051 **внутри своего контейнера**
   - Это **разные** порты 50051 в **разных** контейнерах!

2. **Docker DNS резолюция:**
   - Когда API Gateway делает запрос к `auth-service:50051`, Docker:
     - Резолвит имя `auth-service` в IP адрес контейнера (например, `172.18.0.2`)
     - Направляет запрос на `172.18.0.2:50051`
   - Аналогично для других сервисов

3. **Порты в docker-compose.yml:**
   ```yaml
   auth-service:
     ports:
       - "${AUTH_SERVICE_PORT}:50051"  # Внешний:Внутренний
   ```
   - `50051` - это внутренний порт контейнера
   - `${AUTH_SERVICE_PORT}` - это внешний порт на хост-машине
   - Внутри Docker сети используется только внутренний порт (50051)

### Примеры подключения

#### API Gateway внутри Docker сети

```go
// Правильно: используем имена сервисов
authConn, _ := grpc.Dial(
    "auth-service:50051",        // ✅ Имя сервиса из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)

businessConn, _ := grpc.Dial(
    "business-service:50051",     // ✅ Имя сервиса из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
```

#### API Gateway вне Docker (на хост-машине)

```go
// Если API Gateway запущен на хост-машине
authConn, _ := grpc.Dial(
    "localhost:50051",            // ✅ Внешний порт из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)

businessConn, _ := grpc.Dial(
    "localhost:50052",            // ✅ Другой внешний порт
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
```

### Важные правила

1. **Внутри Docker сети:**
   - Используйте имена сервисов: `auth-service:50051`
   - Все сервисы могут использовать один порт (50051)
   - Docker автоматически маршрутизирует по именам

2. **Извне Docker:**
   - Используйте `localhost` с внешними портами
   - Каждый сервис должен иметь уникальный внешний порт
   - Внешние порты маппятся на внутренний порт 50051

3. **Проверка доступности:**
   ```bash
   # Изнутри Docker контейнера
   docker exec -it api-gateway ping auth-service
   
   # Проверка порта
   docker exec -it api-gateway nc -zv auth-service 50051
   ```

### Конфигурация docker-compose.yml

```yaml
services:
  api-gateway:
    build: ./api_gateway
    # Если API Gateway в том же docker-compose, он автоматически
    # получает доступ ко всем сервисам по их именам
    depends_on:
      - auth-service
      - business-service
      - content-service

  auth-service:
    build: ./auth_service
    ports:
      - "50051:50051"  # Внешний:Внутренний (для доступа извне)
    # Внутри Docker доступен как auth-service:50051

  business-service:
    build: ./business_service
    ports:
      - "50052:50051"  # Внешний:Внутренний (для доступа извне)
    # Внутри Docker доступен как business-service:50051

  content-service:
    build: ./content_service
    ports:
      - "50053:50051"  # Внешний:Внутренний (для доступа извне)
    # Внутри Docker доступен как content-service:50051
```

### Резюме

✅ **Можно использовать один порт (50051) для всех сервисов внутри Docker сети**, потому что:
- Каждый контейнер изолирован
- Docker резолвит имена сервисов в IP адреса
- Порты контейнеров не конфликтуют между собой

✅ **API Gateway должен использовать имена сервисов**, если он находится в той же Docker сети:
- `auth-service:50051`
- `business-service:50051`
- `content-service:50051`

✅ **Внешние порты нужны только для доступа с хост-машины** (например, для тестирования через Postman)
