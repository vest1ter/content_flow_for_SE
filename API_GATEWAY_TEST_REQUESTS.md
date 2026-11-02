# API Gateway - Тестовые запросы

Базовый URL: `http://localhost:8080`

## Аутентификация (Auth)

### 1. Регистрация пользователя
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Ответ:** `201 Created`
```json
{
  "confirmed": false,
  "email_confirm_token": "string",
  "email_message": "string",
  "user_message": "string"
}
```

---

### 2. Подтверждение кода верификации
```bash
curl -X POST http://localhost:8080/api/v1/auth/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email_token": "email_confirm_token_from_register",
    "code": 123456
  }'
```

**Ответ:** `200 OK`
```json
{
  "confirmed": true,
  "access_token": "string",
  "refresh_token": "string",
  "user_message": "string"
}
```

---

### 3. Вход пользователя
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**Ответ:** `200 OK` (если почта подтверждена) или `403 Forbidden` (если не подтверждена)
```json
{
  "confirmed": true,
  "access_token": "string",
  "refresh_token": "string",
  "email_confirm_token": "string",
  "user_message": "string"
}
```

---

### 4. Обновление токена
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your_refresh_token_here"
  }'
```

**Ответ:** `200 OK`
```json
{
  "user_message": "string",
  "access_token": "string"
}
```

---

### 5. Отправка кода сброса пароля
```bash
curl -X POST http://localhost:8080/api/v1/auth/send-password-reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "test@example.com"
  }'
```

**Ответ:** `200 OK`
```json
{
  "user_message": "string",
  "reset_password_token": "string"
}
```

---

### 6. Подтверждение кода сброса пароля
```bash
curl -X POST http://localhost:8080/api/v1/auth/confirm-password-reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "code": 123456,
    "reset_pass_token": "reset_password_token_from_previous_step"
  }'
```

**Ответ:** `200 OK`
```json
{
  "confirmed": true,
  "user_message": "string"
}
```

---

### 7. Сброс пароля
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "reset_pass_token": "reset_password_token_from_previous_step",
    "new_password": "newpassword123"
  }'
```

**Ответ:** `200 OK`
```json
{
  "success": true,
  "user_message": "string"
}
```

---

## Бизнес (Business)

### 8. Создание бизнеса
```bash
curl -X POST http://localhost:8080/api/v1/business/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Мой бизнес",
    "industry": "IT",
    "string": "local",
    "region": "Москва",
    "description": "Описание бизнеса",
    "logo": "base64_encoded_logo_or_empty_string",
    "communication_style": "professional"
  }'
```

**Примечание:** `communication_style` может быть: `"formal"`, `"friendly"`, `"professional"`

**Ответ:** `201 Created`
```json
{
  "business": {
    "id": "string",
    "user_id": "string",
    "name": "string",
    "industry": "string",
    "audience_reach": "string",
    "region": "string",
    "decriprion": "string",
    "logo_url": "string",
    "logo_base64": "string",
    "communication_style": "string",
    "is_active": false,
    "created_at": 1234567890,
    "update_at": 1234567890
  }
}
```

---

### 9. Получение бизнеса по ID
```bash
curl -X GET http://localhost:8080/api/v1/business/get/BUSINESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "business": {
    "id": "string",
    "user_id": "string",
    "name": "string",
    "industry": "string",
    "audience_reach": "string",
    "region": "string",
    "decriprion": "string",
    "logo_url": "string",
    "logo_base64": "string",
    "communication_style": "string",
    "is_active": false,
    "created_at": 1234567890,
    "update_at": 1234567890
  }
}
```

---

### 10. Обновление бизнеса
```bash
curl -X PUT http://localhost:8080/api/v1/business/update/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Обновленное название",
    "industry": "E-commerce",
    "audience_reach": "national",
    "region": "Санкт-Петербург",
    "description": "Обновленное описание",
    "logo": "base64_encoded_logo_or_empty_string",
    "communication_style": "friendly"
  }'
```

**Примечание:** Все поля опциональны (кроме `logo`), можно передать только те, которые нужно обновить.

**Ответ:** `200 OK`
```json
{
  "business": {
    "id": "string",
    "user_id": "string",
    "name": "string",
    "industry": "string",
    "audience_reach": "string",
    "region": "string",
    "decriprion": "string",
    "logo_url": "string",
    "logo_base64": "string",
    "communication_style": "string",
    "is_active": false,
    "created_at": 1234567890,
    "update_at": 1234567890
  }
}
```

---

### 11. Удаление бизнеса
```bash
curl -X DELETE http://localhost:8080/api/v1/business/delete/BUSINESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "success": true
}
```

---

### 12. Список всех бизнесов пользователя
```bash
curl -X GET http://localhost:8080/api/v1/business \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "businesses": [
    {
      "id": "string",
      "user_id": "string",
      "name": "string",
      "industry": "string",
      "audience_reach": "string",
      "region": "string",
      "decriprion": "string",
      "logo_url": "string",
      "logo_base64": "string",
      "communication_style": "string",
      "is_active": false,
      "created_at": 1234567890,
      "update_at": 1234567890
    }
  ]
}
```

---

### 13. Установка активного бизнеса
```bash
curl -X PUT http://localhost:8080/api/v1/business/set/BUSINESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "success": true,
  "business": {
    "id": "string",
    "user_id": "string",
    "name": "string",
    "industry": "string",
    "audience_reach": "string",
    "region": "string",
    "decriprion": "string",
    "logo_url": "string",
    "logo_base64": "string",
    "communication_style": "string",
    "is_active": true,
    "created_at": 1234567890,
    "update_at": 1234567890
  }
}
```

---

### 14. Получение активного бизнеса
```bash
curl -X GET http://localhost:8080/api/v1/business/active \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "business": {
    "id": "string",
    "user_id": "string",
    "name": "string",
    "industry": "string",
    "audience_reach": "string",
    "region": "string",
    "decriprion": "string",
    "logo_url": "string",
    "logo_base64": "string",
    "communication_style": "string",
    "is_active": true,
    "created_at": 1234567890,
    "update_at": 1234567890
  }
}
```

---

## Контент (Content)

### 15. Анализ Telegram канала
```bash
curl -X GET "http://localhost:8080/api/v1/content/telegram_channel?channel_username=channelname&start_date=1609459200&end_date=1640995200" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Параметры запроса:**
- `channel_username` - имя канала (обязательно)
- `start_date` - начальная дата (Unix timestamp, обязательно)
- `end_date` - конечная дата (Unix timestamp, обязательно)

**Ответ:** `200 OK`
```json
{
  "telegram_post": [
    {
      "message_id": 123,
      "text": "Текст поста",
      "views": 1000,
      "date": 1609459200
    }
  ]
}
```

---

### 16. Генерация поста из Telegram постов
```bash
curl -X POST http://localhost:8080/api/v1/content/generate_post_telegram/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "selected_post": [
      {
        "message_id": 123,
        "text": "Текст первого поста",
        "views": 1000
      },
      {
        "message_id": 124,
        "text": "Текст второго поста",
        "views": 2000
      }
    ]
  }'
```

**Ответ:** `200 OK`
```json
{
  "generated_post": "Сгенерированный текст поста",
  "message": "string"
}
```

---

### 17. Генерация бизнес-поста
```bash
curl -X POST http://localhost:8080/api/v1/content/generate_post/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "description": "Описание того, о чем должен быть пост",
    "goal": 1,
    "tone": "professional"
  }'
```

**Ответ:** `200 OK`
```json
{
  "generated_post": "Сгенерированный текст поста",
  "message": "string"
}
```

---

### 18. Генерация контент-плана
```bash
curl -X POST http://localhost:8080/api/v1/content/generate_content_plan/BUSINESS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "goal": 1,
    "total_days": 30,
    "period_days": 30,
    "description": "Описание целей контент-плана"
  }'
```

**Ответ:** `200 OK`
```json
{
  "content_plan_item": [
    {
      "tittle": "Заголовок",
      "idea": "Идея поста",
      "format": "post",
      "goal": 1,
      "planned_date": 1609459200
    }
  ]
}
```

---

### 19. Получение контент-плана
```bash
curl -X POST http://localhost:8080/api/v1/content/plan/PLAN_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ответ:** `200 OK`
```json
{
  "plan_id": "string",
  "user_id": "string",
  "bussines_id": "string",
  "goal": 1,
  "total_posts": 30,
  "period_days": 30,
  "desctiption": "string",
  "content_plan_item": [
    {
      "tittle": "Заголовок",
      "idea": "Идея поста",
      "format": "post",
      "goal": 1,
      "planned_date": 1609459200
    }
  ],
  "created_at": 1609459200,
  "updated_at": "string",
  "message": "string"
}
```

---

## Примечания

1. **Авторизация:** Большинство эндпоинтов требуют заголовок `Authorization: Bearer YOUR_ACCESS_TOKEN`. Получите токен через `/api/v1/auth/login` или `/api/v1/auth/confirm`.

2. **Ошибки:**
   - `400 Bad Request` - некорректные данные
   - `401 Unauthorized` - отсутствует или невалидный токен
   - `403 Forbidden` - недостаточно прав или почта не подтверждена
   - `404 Not Found` - ресурс не найден
   - `409 Conflict` - пользователь уже существует
   - `500 Internal Server Error` - внутренняя ошибка сервера

3. **Валидация пароля:** Пароль должен содержать минимум 5 символов и хотя бы одну цифру.

4. **Communication Style:** Допустимые значения: `"formal"`, `"friendly"`, `"professional"`.

5. **Unix Timestamp:** Даты передаются как Unix timestamp (int64).

6. **Base URL:** Замените `http://localhost:8080` на актуальный адрес вашего API Gateway.
