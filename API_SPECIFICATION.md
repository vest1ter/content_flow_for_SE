# API Gateway Specification для Micro CMS

## Общая информация

Этот документ описывает спецификацию gRPC API для всех микросервисов системы Micro CMS. API Gateway на Go должен использовать эти спецификации для взаимодействия с микросервисами.

### Архитектура

- **Auth Service** (порт 50051) - Аутентификация и авторизация
- **Business Service** (порт 50051) - Управление бизнесами
- **Content Service** (порт 50051) - Управление контентом и генерация постов

### Важные замечания

1. Все сервисы используют **gRPC** для коммуникации
2. Все сервисы слушают на порту **50051** внутри Docker сети
3. **Важно:** В Docker сети каждый контейнер имеет уникальное имя хоста, поэтому все сервисы могут использовать один и тот же порт (50051). API Gateway обращается к сервисам по их именам:
   - `auth-service:50051`
   - `business-service:50051`
   - `content-service:50051`
4. Для доступа извне (из хост-машины) используются переменные окружения, которые маппят разные внешние порты на внутренний порт 50051 каждого контейнера
5. Все методы требуют `access_token` для аутентификации (кроме методов регистрации и логина)
6. Все даты передаются как **Unix timestamp (int64)**
7. Все UUID передаются как **строки**

---

## Auth Service

**Package:** `auth.v1`  
**Service Name:** `AuthService`  
**Go Package:** `gen/auth/v1;authv1`

### 1. ValidateToken

Проверяет валидность токена и возвращает информацию о пользователе.

**Request:**
```protobuf
message TokenRequest {
  string token = 1;
}
```

**Response:**
```protobuf
message TokenResponse {
  bool valid = 1;
  string user_id = 2;
}
```

**Пример запроса (JSON для Go):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "valid": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Токен невалиден или отсутствует

---

### 2. RegisterUser

Регистрирует нового пользователя в системе.

**Request:**
```protobuf
message RegisterUserRequest {
  string username = 1;
  string email = 2;
  string password = 3;
  string repeat_password = 4;
}
```

**Response:**
```protobuf
message RegisterUserResponse {
  string message = 1;
  bool confirmed = 2;
  string email_confirm_token = 3;
}
```

**Пример запроса:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "repeat_password": "SecurePassword123!"
}
```

**Пример ответа:**
```json
{
  "message": "success register john_doe user with email john@example.com please confirm email",
  "confirmed": false,
  "email_confirm_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `INVALID_ARGUMENT` - Пароли не совпадают
- `ALREADY_EXISTS` - Пользователь с таким email уже существует
- `INTERNAL` - Внутренняя ошибка сервера

---

### 3. LoginUser

Аутентифицирует пользователя и возвращает токены доступа.

**Request:**
```protobuf
message LoginUserRequest {
  string username = 1;  // Может быть username или email
  string password = 2;
}
```

**Response:**
```protobuf
message LoginUserResponse {
  bool confirmed = 1;
  optional string access_token = 2;
  optional string refresh_token = 3;
  optional string email_confirm_token = 4;
  string message = 5;
}
```

**Пример запроса:**
```json
{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

**Пример ответа (email не подтвержден):**
```json
{
  "confirmed": false,
  "access_token": null,
  "refresh_token": null,
  "email_confirm_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Email not confirmed"
}
```

**Пример ответа (успешный вход):**
```json
{
  "confirmed": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email_confirm_token": null,
  "message": "Login successful"
}
```

**Коды ошибок:**
- `INVALID_ARGUMENT` - Неверный username/email или пароль
- `INTERNAL` - Внутренняя ошибка сервера

---

### 4. SendVerifyCode

Отправляет код подтверждения email на указанный адрес.

**Request:**
```protobuf
message SendVerifyCodeRequest {
  string email = 1;
  string email_token = 2;  // Токен из RegisterUserResponse
}
```

**Response:**
```protobuf
message SendVerifyCodeResponse {
  string message = 1;
}
```

**Пример запроса:**
```json
{
  "email": "john@example.com",
  "email_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "message": "Verification code sent to email"
}
```

**Коды ошибок:**
- `INTERNAL` - Внутренняя ошибка сервера

---

### 5. ConfirmVerifyCode

Подтверждает email пользователя с помощью кода.

**Request:**
```protobuf
message ConfirmVerifyCodeRequest {
  int32 code = 1;  // 6-значный код
  string email_token = 2;
}
```

**Response:**
```protobuf
message ConfirmVerifyCodeResponse {
  bool confirmed = 1;
  string access_token = 2;
  string refresh_token = 3;
  string message = 4;
}
```

**Пример запроса:**
```json
{
  "code": 123456,
  "email_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "confirmed": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Email confirmed successfully"
}
```

**Коды ошибок:**
- `INVALID_ARGUMENT` - Неверный код
- `INTERNAL` - Внутренняя ошибка сервера

---

### 6. RefreshUserToken

Обновляет access token используя refresh token.

**Request:**
```protobuf
message RefreshUserTokenRequest {
  string refresh_token = 1;
}
```

**Response:**
```protobuf
message RefreshUserTokenResponse {
  string message = 1;
  string access_token = 2;
}
```

**Пример запроса:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "message": "Token refreshed successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный refresh token
- `INTERNAL` - Внутренняя ошибка сервера

---

### 7. SendPasswordResetCode

Отправляет код для сброса пароля на email пользователя.

**Request:**
```protobuf
message SendPasswordResetCodeRequest {
  string email = 1;
}
```

**Response:**
```protobuf
message SendPasswordResetCodeResponse {
  string message = 1;
  string reset_pass_token = 2;
}
```

**Пример запроса:**
```json
{
  "email": "john@example.com"
}
```

**Пример ответа:**
```json
{
  "message": "Password reset code sent to email",
  "reset_pass_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `NOT_FOUND` - Пользователь с таким email не найден
- `INTERNAL` - Внутренняя ошибка сервера

---

### 8. ConfirmPasswordResetCode

Подтверждает код для сброса пароля.

**Request:**
```protobuf
message ConfirmPasswordResetCodeRequest {
  int32 code = 1;  // 6-значный код
  string reset_pass_token = 2;
}
```

**Response:**
```protobuf
message ConfirmPasswordResetCodeResponse {
  bool confirmed = 1;
  string message = 2;
}
```

**Пример запроса:**
```json
{
  "code": 123456,
  "reset_pass_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "confirmed": true,
  "message": "Code confirmed successfully"
}
```

**Коды ошибок:**
- `INVALID_ARGUMENT` - Неверный код
- `INTERNAL` - Внутренняя ошибка сервера

---

### 9. ResetPassword

Устанавливает новый пароль пользователя.

**Request:**
```protobuf
message ResetPasswordRequest {
  string reset_pass_token = 1;
  string new_password = 2;
  string repeat_password = 3;
}
```

**Response:**
```protobuf
message ResetPasswordResponse {
  bool success = 1;
  string message = 2;
}
```

**Пример запроса:**
```json
{
  "reset_pass_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePassword123!",
  "repeat_password": "NewSecurePassword123!"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Коды ошибок:**
- `INVALID_ARGUMENT` - Пароли не совпадают или невалидный токен
- `NOT_FOUND` - Пользователь не найден
- `INTERNAL` - Внутренняя ошибка сервера

---

## Business Service

**Package:** `business.v1`  
**Service Name:** `BusinessService`  
**Go Package:** `gen/business/v1;businessv1`

### Общие замечания

- Все методы требуют `access_token` в запросе
- Максимальное количество бизнесов на пользователя: **2**
- Логотипы возвращаются как **base64 строки** (поле `logo_base64`)
- Поле `logo_url` устарело, но оставлено для обратной совместимости

### 1. CreateBusiness

Создает новый бизнес для пользователя.

**communication_style**
только такие
```
    "formal"
    "friendly"
    "professional"
```

**Request:**
```protobuf
message CreateBusinessRequest {
  string access_token = 1;
  string name = 2;
  string industry = 3;
  string audience_reach = 4;
  string region = 5;
  string description = 6;
  bytes logo_bytes = 7;  // base64 данные изображения
  string communication_style = 8;
}
```

**Response:**
```protobuf
message CreateBusinessResponse {
  Business business = 1;
}
```

**Пример запроса:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "name": "My Awesome Business",
  "industry": "IT",
  "audience_reach": "Global",
  "region": "Moscow",
  "description": "We create amazing software",
  "logo_bytes": "<base64_encoded_image_bytes>",
  "communication_style": "Professional"
}
```

**Пример ответа:**
```json
{
  "business": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "My Awesome Business",
    "industry": "IT",
    "audience_reach": "Global",
    "region": "Moscow",
    "description": "We create amazing software",
    "logo_url": "http://minio:9000/business-logos/...",
    "logo_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "communication_style": "Professional",
    "is_active": false,
    "created_at": 1704067200,
    "updated_at": 1704067200
  }
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `RESOURCE_EXHAUSTED` - Достигнут лимит бизнесов (2)
- `INTERNAL` - Внутренняя ошибка сервера

---

### 2. GetBusiness

Получает информацию о бизнесе по ID.

**Request:**
```protobuf
message GetBusinessRequest {
  string business_id = 1;
  string access_token = 2;
}
```

**Response:**
```protobuf
message GetBusinessResponse {
  Business business = 1;
}
```

**Пример запроса:**
```json
{
  "business_id": "123e4567-e89b-12d3-a456-426614174000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `NOT_FOUND` - Бизнес не найден или не принадлежит пользователю
- `INTERNAL` - Внутренняя ошибка сервера

---

### 3. UpdateBusiness

Обновляет информацию о бизнесе.

**Request:**
```protobuf
message UpdateBusinessRequest {
  string business_id = 1;
  optional string name = 2;
  optional string industry = 3;
  optional string audience_reach = 4;
  optional string region = 5;
  optional string description = 6;
  optional bytes logo_bytes = 7;  // Если не передан - не обновляется
  optional string communication_style = 8;
  string access_token = 9;
}
```

**Response:**
```protobuf
message UpdateBusinessResponse {
  Business business = 1;
}
```

**Пример запроса:**
```json
{
  "business_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Business Name",
  "description": "Updated description",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `NOT_FOUND` - Бизнес не найден или не принадлежит пользователю
- `INTERNAL` - Внутренняя ошибка сервера

---

### 4. DeleteBusiness

Удаляет бизнес.

**Request:**
```protobuf
message DeleteBusinessRequest {
  string business_id = 1;
  string access_token = 2;
}
```

**Response:**
```protobuf
message DeleteBusinessResponse {
  bool success = 1;
}
```

**Пример запроса:**
```json
{
  "business_id": "123e4567-e89b-12d3-a456-426614174000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "success": true
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `NOT_FOUND` - Бизнес не найден или не принадлежит пользователю
- `INTERNAL` - Внутренняя ошибка сервера

---

### 5. ListBusinesses

Получает список всех бизнесов пользователя.

**Request:**
```protobuf
message ListBusinessesRequest {
  string access_token = 1;
}
```

**Response:**
```protobuf
message ListBusinessesResponse {
  repeated Business businesses = 1;
}
```

**Пример запроса:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "businesses": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Business 1",
      "is_active": true,
      ...
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "user_id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Business 2",
      "is_active": false,
      ...
    }
  ]
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INTERNAL` - Внутренняя ошибка сервера

---

### 6. SetActiveBusiness

Устанавливает бизнес как активный (деактивирует все остальные бизнесы пользователя).

**Request:**
```protobuf
message SetActiveBusinessRequest {
  string business_id = 1;
  string access_token = 2;
}
```

**Response:**
```protobuf
message SetActiveBusinessResponse {
  bool success = 1;
  Business business = 2;
}
```

**Пример запроса:**
```json
{
  "business_id": "123e4567-e89b-12d3-a456-426614174000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "success": true,
  "business": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "is_active": true,
    ...
  }
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `NOT_FOUND` - Бизнес не найден или не принадлежит пользователю
- `INTERNAL` - Внутренняя ошибка сервера

---

### 7. GetActiveBusiness

Получает активный бизнес пользователя.

**Request:**
```protobuf
message GetActiveBusinessRequest {
  string access_token = 1;
}
```

**Response:**
```protobuf
message GetActiveBusinessResponse {
  Business business = 1;
}
```

**Пример запроса:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `NOT_FOUND` - Активный бизнес не найден
- `INTERNAL` - Внутренняя ошибка сервера

---

### Модель Business

```protobuf
message Business {
  string id = 1;
  string user_id = 2;
  string name = 3;
  string industry = 4;
  string audience_reach = 5;   // Опционально
  string region = 6;           // Опционально
  string description = 7;
  string logo_url = 8;         // Устарело, оставлено для совместимости
  string logo_base64 = 13;     // Base64 строка изображения
  string communication_style = 9;
  bool is_active = 12;
  int64 created_at = 10;       // Unix timestamp
  int64 updated_at = 11;       // Unix timestamp
}
```

---

## Content Service

**Package:** `content.v1`  
**Service Name:** `ContentService`  
**Go Package:** `gen/content/v1;contentv1`

### Общие замечания

- Все методы требуют `access_token` в запросе
- Платформа фиксирована: **Telegram**
- Даты передаются как **Unix timestamp (int64)**

### 1. AnalyzeTelegramChannel

Анализирует Telegram канал и возвращает топ-5 популярных постов за указанный период.

**Request:**
```protobuf
message AnalyzeTelegramChannelRequest {
  string channel_username = 1;  // Короткое имя канала (например, @channel_name)
  int64 start_date = 2;         // Начало периода (Unix timestamp)
  int64 end_date = 3;           // Конец периода (Unix timestamp)
  string access_token = 4;
}
```

**Response:**
```protobuf
message AnalyzeTelegramChannelResponse {
  repeated TelegramPost popular_posts = 1;
  string message = 2;
}
```

**Пример запроса:**
```json
{
  "channel_username": "@example_channel",
  "start_date": 1704067200,  // 1 января 2024
  "end_date": 1704153600,    // 2 января 2024
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "popular_posts": [
    {
      "message_id": 12345,
      "text": "Post text content...",
      "views": 15000,
      "date": 1704067200
    },
    {
      "message_id": 12346,
      "text": "Another post...",
      "views": 12000,
      "date": 1704070800
    }
  ],
  "message": "Analysis completed"
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INVALID_ARGUMENT` - Неверный формат канала или дат
- `NOT_FOUND` - Канал не найден или недоступен
- `INTERNAL` - Внутренняя ошибка сервера

---

### 2. GeneratePostFromTelegramPosts

Генерирует пост на основе выбранных постов из Telegram.

**Важно:** API Gateway должен получить информацию о бизнесе из Business Service и передать её в этом запросе.

**Request:**
```protobuf
message GeneratePostFromTelegramPostsRequest {
  repeated SelectedPost selected_posts = 1;
  BusinessInfo business_info = 2;
  string access_token = 3;
}
```

**Response:**
```protobuf
message GeneratePostFromTelegramPostsResponse {
  string generated_post = 1;
  string message = 2;
}
```

**Модель SelectedPost:**
```protobuf
message SelectedPost {
  int32 message_id = 1;
  string text = 2;
  int32 views = 3;
}
```

**Пример запроса:**
```json
{
  "selected_posts": [
    {
      "message_id": 12345,
      "text": "First post text...",
      "views": 15000
    },
    {
      "message_id": 12346,
      "text": "Second post text...",
      "views": 12000
    }
  ],
  "business_info": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "My Awesome Business",
    "industry": "IT",
    "description": "We create amazing software",
    "communication_style": "Professional",
    "audience_reach": "Global",
    "region": "Moscow"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "generated_post": "это новый пост",
  "message": "Пост успешно сгенерирован и сохранен (ID: 123e4567-e89b-12d3-a456-426614174000)"
}
```

**Примечание:** Сгенерированный пост автоматически сохраняется в базу данных в thread "generated_telegram_posts".

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INVALID_ARGUMENT` - Не выбраны посты для генерации или информация о бизнесе отсутствует
- `INTERNAL` - Внутренняя ошибка сервера

---

### 3. GenerateBusinessPost

Генерирует пост для бизнеса на основе описания, цели и информации о бизнесе.

**Важно:** API Gateway должен получить информацию о бизнесе из Business Service и передать её в этом запросе.

**Request:**
```protobuf
message GenerateBusinessPostRequest {
  string description = 1;           // Описание для поста (обязательно)
  PostGoal goal = 2;                // Цель поста
  optional string tone = 3;         // Тон поста (опционально, строка)
  BusinessInfo business_info = 4;   // Информация о бизнесе
  string access_token = 5;
}
```

**Response:**
```protobuf
message GenerateBusinessPostResponse {
  string generated_post = 1;         // Сгенерированный текст поста
  string message = 2;
}
```

**Enum PostGoal:**
```protobuf
enum PostGoal {
  INCREASE_SALES = 0;
  INCREASE_ENGAGEMENT = 1;
  AWARENESS = 2;
  OTHER = 3;
}
```

**Модель BusinessInfo:**
```protobuf
message BusinessInfo {
  string id = 1;
  string name = 2;
  string industry = 3;
  string description = 4;
  string communication_style = 5;
  optional string audience_reach = 6;
  optional string region = 7;
}
```

**Пример запроса:**
```json
{
  "description": "Новый продукт для бизнеса",
  "goal": "INCREASE_SALES",
  "tone": "Профессиональный",
  "business_info": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "My Awesome Business",
    "industry": "IT",
    "description": "We create amazing software",
    "communication_style": "Professional",
    "audience_reach": "Global",
    "region": "Moscow"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "generated_post": "Пост для бизнеса: My Awesome Business\nСфера: IT\nОписание: Новый продукт для бизнеса\nЦель: INCREASE_SALES\nПлатформа: Telegram\nТон: Профессиональный\nСтиль общения: Professional",
  "message": "Пост успешно сгенерирован и сохранен (ID: 123e4567-e89b-12d3-a456-426614174000)"
}
```

**Примечание:** Сгенерированный пост автоматически сохраняется в базу данных в thread "generated_business_posts".

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INVALID_ARGUMENT` - Описание обязательно или информация о бизнесе отсутствует
- `INTERNAL` - Внутренняя ошибка сервера

---

### 4. GenerateContentPlan

Генерирует контент-план для бизнеса с заданным количеством идей на указанный период.

**Важно:** API Gateway должен получить информацию о бизнесе из Business Service и передать её в этом запросе.

**Request:**
```protobuf
message GenerateContentPlanRequest {
  BusinessInfo business_info = 1;
  PostGoal goal = 2;
  int32 total_posts = 3;
  int32 period_days = 4;
  optional string description = 5;
  string access_token = 6;
}
```

**Response:**
```protobuf
message GenerateContentPlanResponse {
  repeated ContentPlanItem items = 1;
  string message = 2;
  string plan_id = 3;
}
```

**Модель ContentPlanItem:**
```protobuf
message ContentPlanItem {
  string title = 1;
  string idea = 2;
  string format = 3;
  PostGoal goal = 4;
  optional int64 planned_date = 5;
}
```

**Пример запроса:**
```json
{
  "business_info": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "My Awesome Business",
    "industry": "IT",
    "description": "We create amazing software",
    "communication_style": "Professional",
    "audience_reach": "Global",
    "region": "Moscow"
  },
  "goal": "INCREASE_ENGAGEMENT",
  "total_posts": 7,
  "period_days": 14,
  "description": "Фокус на новых продуктах",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "items": [
    {
      "title": "История успеха клиента",
      "idea": "Расскажите о том, как ваш продукт помог клиенту увеличить продажи на 40%. Покажите конкретные цифры и результаты.",
      "format": "кейс-стади",
      "goal": "INCREASE_SALES",
      "planned_date": null
    },
    {
      "title": "Технологии 2024",
      "idea": "Обзор трендов веб-разработки в 2024 году",
      "format": "образовательный пост",
      "goal": "INCREASE_ENGAGEMENT",
      "planned_date": null
    }
  ],
  "message": "Контент-план успешно сгенерирован и сохранен (ID: 123e4567-e89b-12d3-a456-426614174001): 7 идей",
  "plan_id": "123e4567-e89b-12d3-a456-426614174001"
}
```

**Примечание:** Сгенерированный контент-план автоматически сохраняется в базу данных.

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INVALID_ARGUMENT` - Информация о бизнесе обязательна, количество постов или период должны быть больше 0
- `INTERNAL` - Внутренняя ошибка сервера или ошибка LLM

---

### 5. GetContentPlan

Получает сохраненный контент-план по ID.

**Request:**
```protobuf
message GetContentPlanRequest {
  string plan_id = 1;
  string access_token = 2;
}
```

**Response:**
```protobuf
message GetContentPlanResponse {
  string plan_id = 1;
  string user_id = 2;
  optional string business_id = 3;
  PostGoal goal = 4;
  int32 total_posts = 5;
  int32 period_days = 6;
  optional string description = 7;
  repeated ContentPlanItem items = 8;
  int64 created_at = 9;
  optional int64 updated_at = 10;
  string message = 11;
}
```

**Пример запроса:**
```json
{
  "plan_id": "123e4567-e89b-12d3-a456-426614174001",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример ответа:**
```json
{
  "plan_id": "123e4567-e89b-12d3-a456-426614174001",
  "user_id": "123e4567-e89b-12d3-a456-426614174002",
  "business_id": "123e4567-e89b-12d3-a456-426614174000",
  "goal": "INCREASE_ENGAGEMENT",
  "total_posts": 7,
  "period_days": 14,
  "description": "Фокус на новых продуктах",
  "items": [
    {
      "title": "История успеха клиента",
      "idea": "Расскажите о том, как ваш продукт помог клиенту...",
      "format": "кейс-стади",
      "goal": "INCREASE_SALES",
      "planned_date": null
    }
  ],
  "created_at": 1704067200,
  "updated_at": null,
  "message": "Контент-план успешно получен"
}
```

**Коды ошибок:**
- `UNAUTHENTICATED` - Невалидный токен
- `INVALID_ARGUMENT` - ID контент-плана обязателен или неверный формат
- `NOT_FOUND` - Контент-план не найден или не принадлежит пользователю
- `INTERNAL` - Внутренняя ошибка сервера

---

## Коды ошибок gRPC

Все сервисы используют стандартные коды ошибок gRPC:

- `OK` (0) - Успешное выполнение
- `CANCELLED` (1) - Операция отменена
- `UNKNOWN` (2) - Неизвестная ошибка
- `INVALID_ARGUMENT` (3) - Неверные аргументы запроса
- `DEADLINE_EXCEEDED` (4) - Превышено время ожидания
- `NOT_FOUND` (5) - Ресурс не найден
- `ALREADY_EXISTS` (6) - Ресурс уже существует
- `PERMISSION_DENIED` (7) - Доступ запрещен
- `RESOURCE_EXHAUSTED` (8) - Исчерпаны ресурсы (например, лимит бизнесов)
- `FAILED_PRECONDITION` (9) - Не выполнено предварительное условие
- `ABORTED` (10) - Операция прервана
- `OUT_OF_RANGE` (11) - Выход за допустимый диапазон
- `UNIMPLEMENTED` (12) - Метод не реализован
- `INTERNAL` (13) - Внутренняя ошибка сервера
- `UNAVAILABLE` (14) - Сервис недоступен
- `DATA_LOSS` (15) - Потеря данных
- `UNAUTHENTICATED` (16) - Не аутентифицирован

---

## Подключение к сервисам

### Из Docker сети (для API Gateway внутри Docker)

**Важно:** В Docker сети каждый контейнер изолирован и имеет свой собственный IP адрес. Docker создает внутреннюю DNS сеть, где каждое имя сервиса резолвится в IP адрес соответствующего контейнера. Поэтому все сервисы могут использовать один и тот же порт (50051), но они доступны по разным именам хостов:

- `auth-service:50051` - обращается к контейнеру auth-service на его внутреннем порту 50051
- `business-service:50051` - обращается к контейнеру business-service на его внутреннем порту 50051
- `content-service:50051` - обращается к контейнеру content-service на его внутреннем порту 50051

**Как это работает:**
```
┌─────────────────────────────────────────┐
│         Docker Network (bridge)          │
│                                          │
│  ┌──────────────┐                       │
│  │ API Gateway   │                       │
│  │              │                       │
│  │ Connects to: │                       │
│  │ - auth-service:50051                 │
│  │ - business-service:50051             │
│  │ - content-service:50051              │
│  └──────────────┘                       │
│         │                                │
│    ┌────┴────┬──────────────┐           │
│    │         │              │           │
│  ┌─▼──┐  ┌──▼──┐  ┌───────▼─┐         │
│  │auth│  │biz  │  │content  │         │
│  │:50051│ │:50051│ │:50051   │         │
│  └────┘  └─────┘  └─────────┘         │
│                                          │
└─────────────────────────────────────────┘
```

Каждый контейнер изолирован, поэтому порт 50051 в контейнере auth-service - это не тот же порт, что 50051 в контейнере business-service. Docker маршрутизирует запросы по именам хостов.

### Извне Docker (для прямого доступа с хост-машины)

Для доступа извне Docker используются маппинги портов в `docker-compose.yml`:
- Внешний порт → Внутренний порт 50051 каждого контейнера

Например:
- `localhost:50051` (или `AUTH_SERVICE_PORT`) → `auth-service:50051` внутри Docker
- `localhost:50052` (или `BUSINESS_SERVICE_PORT`) → `business-service:50051` внутри Docker
- `localhost:50053` (или `CONTENT_SERVICE_PORT`) → `content-service:50051` внутри Docker

**Важно:** Если API Gateway находится внутри Docker сети (в том же docker-compose), используйте имена сервисов (`auth-service:50051`), а не `localhost` или внешние порты!

### Пример подключения на Go (для API Gateway внутри Docker)

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    authpb "gen/auth/v1"
    businesspb "gen/business/v1"
    contentpb "gen/content/v1"
)

// Подключение к Auth Service
authConn, err := grpc.Dial(
    "auth-service:50051",  // Имя сервиса из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
if err != nil {
    log.Fatalf("Failed to connect to auth-service: %v", err)
}
defer authConn.Close()
authClient := authpb.NewAuthServiceClient(authConn)

// Подключение к Business Service
businessConn, err := grpc.Dial(
    "business-service:50051",  // Имя сервиса из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
if err != nil {
    log.Fatalf("Failed to connect to business-service: %v", err)
}
defer businessConn.Close()
businessClient := businesspb.NewBusinessServiceClient(businessConn)

// Подключение к Content Service
contentConn, err := grpc.Dial(
    "content-service:50051",  // Имя сервиса из docker-compose.yml
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
if err != nil {
    log.Fatalf("Failed to connect to content-service: %v", err)
}
defer contentConn.Close()
contentClient := contentpb.NewContentServiceClient(contentConn)
```

**Важно:** 
- Используйте имена сервисов из `docker-compose.yml` (например, `auth-service`, `business-service`, `content-service`)
- Все сервисы слушают на порту `50051` внутри своих контейнеров
- Docker автоматически резолвит имена сервисов в IP адреса контейнеров
- Если API Gateway находится вне Docker, используйте `localhost` с внешними портами из переменных окружения

---

## Важные замечания для разработчика API Gateway

1. **Аутентификация:** Все методы (кроме RegisterUser и LoginUser) требуют `access_token`. Используйте `ValidateToken` для проверки токена перед вызовом других методов.

2. **Обработка ошибок:** Всегда проверяйте gRPC статус код ответа. Используйте `status.FromError()` для получения деталей ошибки.

3. **Бизнес-логика в API Gateway:**
   - Для `GenerateBusinessPost` необходимо сначала получить активный бизнес через `GetActiveBusiness` из Business Service, затем передать его в Content Service.
   - Для `GenerateContentPlan` необходимо сначала получить активный бизнес через `GetActiveBusiness` из Business Service, затем передать его в Content Service.
   - Контент-планы автоматически сохраняются в базу данных при генерации. Используйте `GetContentPlan` для получения сохраненных планов.
   - Для `GenerateContentPlan` необходимо сначала получить активный бизнес через `GetActiveBusiness` из Business Service, затем передать его в Content Service.
   - Контент-планы автоматически сохраняются в базу данных при генерации. Используйте `GetContentPlan` для получения сохраненных планов.

4. **Типы данных:**
   - UUID всегда передаются как строки
   - Даты всегда Unix timestamp (int64)
   - Изображения передаются как bytes или base64 строки

5. **Лимиты:**
   - Максимум 2 бизнеса на пользователя
   - Только один активный бизнес на пользователя

6. **Платформа:** Все посты генерируются для Telegram (фиксированно)

---

## Примеры использования

### Полный цикл: Регистрация → Подтверждение → Создание бизнеса → Генерация контента

1. **RegisterUser** → получаем `email_confirm_token`
2. **SendVerifyCode** → отправляем код на email
3. **ConfirmVerifyCode** → получаем `access_token` и `refresh_token`
4. **CreateBusiness** → создаем бизнес
5. **SetActiveBusiness** → устанавливаем активный бизнес
6. **GenerateBusinessPost** → генерируем пост
7. **GenerateContentPlan** → генерируем контент-план (получаем `plan_id`)
8. **GetContentPlan** → получаем сохраненный контент-план по `plan_id`

### Полный цикл: Сброс пароля

1. **SendPasswordResetCode** → получаем `reset_pass_token`
2. **ConfirmPasswordResetCode** → подтверждаем код
3. **ResetPassword** → устанавливаем новый пароль

---

## Контакты и поддержка

При возникновении вопросов обращайтесь к команде разработки.

**Версия документа:** 1.0  
**Дата обновления:** 2026-01-15
