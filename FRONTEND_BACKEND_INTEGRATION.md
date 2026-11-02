# Полная интеграция фронтенда с бэкендом

## ✅ Что было исправлено

### 1. Конфигурация API (`src/api/config.js`)
- ✅ Базовый URL: `http://localhost:8080`
- ✅ API версия: `/api/v1`
- ✅ Правильная функция `getFullUrl()` для формирования полных URL
- ✅ Корректная обработка авторизационных заголовков

### 2. Auth Service (`src/api/authService.js`)
- ✅ Все endpoints соответствуют API Gateway:
  - `POST /api/v1/auth/register` - регистрация
  - `POST /api/v1/auth/confirm` - подтверждение кода
  - `POST /api/v1/auth/login` - вход
  - `POST /api/v1/auth/refresh` - обновление токена
  - `POST /api/v1/auth/send-password-reset` - отправка кода сброса
  - `POST /api/v1/auth/confirm-password-reset` - подтверждение кода сброса
  - `POST /api/v1/auth/reset-password` - сброс пароля
- ✅ Правильная структура запросов
- ✅ Корректная обработка ответов и ошибок

### 3. Business Service (`src/api/businessService.js`)
- ✅ Все endpoints соответствуют API Gateway:
  - `POST /api/v1/business/create` - создание
  - `GET /api/v1/business/get/:id` - получение по ID
  - `PUT /api/v1/business/update/:id` - обновление
  - `DELETE /api/v1/business/delete/:id` - удаление
  - `GET /api/v1/business` - список всех
  - `PUT /api/v1/business/set/:id` - установка активного
  - `GET /api/v1/business/active` - получение активного
- ✅ Изменен с FormData на JSON (бэкенд ожидает JSON)
- ✅ Правильные имена полей (включая `audience_reach`)
- ✅ Корректная обработка base64 для логотипов

### 4. Content Service (`src/api/contentService.js`)
- ✅ Все endpoints соответствуют API Gateway:
  - `POST /api/v1/content/generate_post_telegram/:id` - генерация из Telegram
  - `POST /api/v1/content/generate_post/:id` - генерация бизнес-поста
  - `POST /api/v1/content/generate_content_plan/:id` - генерация контент-плана
  - `POST /api/v1/content/plan/:id` - получение контент-плана
- ✅ Правильная конвертация `goal` в числовой формат (0, 1)
- ✅ Корректная структура запросов

### 5. Telegram Service (`src/api/telegramService.js`)
- ✅ Новый сервис для анализа Telegram каналов
- ✅ Endpoint: `GET /api/v1/content/telegram_channel`
- ✅ Правильная конвертация дат в Unix timestamp
- ✅ Корректная обработка query параметров

### 6. Исправление бэкенда
- ✅ Исправлена ошибка в `api-gateway/internal/domain/request.go`:
  - Было: `AudienceReach string `json:"string"``
  - Стало: `AudienceReach string `json:"audience_reach"``

### 7. Файл `.env`
- ✅ Создан файл `.env` с правильным URL API Gateway

## 📋 Структура запросов

### Auth
```javascript
// Регистрация
POST /api/v1/auth/register
Body: { username, email, password }

// Подтверждение кода
POST /api/v1/auth/confirm
Body: { email_token, code: number }

// Вход
POST /api/v1/auth/login
Body: { username, password }
```

### Business
```javascript
// Создание
POST /api/v1/business/create
Headers: Authorization: Bearer <token>
Body: { name, industry, audience_reach, region, description, logo (base64), communication_style }

// Получение по ID
GET /api/v1/business/get/:id
Headers: Authorization: Bearer <token>

// Обновление
PUT /api/v1/business/update/:id
Headers: Authorization: Bearer <token>
Body: { name?, industry?, audience_reach?, region?, description?, logo, communication_style? }
```

### Content
```javascript
// Анализ Telegram канала
GET /api/v1/content/telegram_channel?channel_username=...&start_date=...&end_date=...
Headers: Authorization: Bearer <token>

// Генерация поста из Telegram
POST /api/v1/content/generate_post_telegram/:id
Headers: Authorization: Bearer <token>
Body: { selected_post: [{ message_id, text, views }] }

// Генерация бизнес-поста
POST /api/v1/content/generate_post/:id
Headers: Authorization: Bearer <token>
Body: { description, goal: 0|1, tone }

// Генерация контент-плана
POST /api/v1/content/generate_content_plan/:id
Headers: Authorization: Bearer <token>
Body: { goal: 0|1, total_days, period_days, description }
```

## 🚀 Запуск

1. Убедитесь, что бэкенд запущен в Docker:
```bash
docker ps | findstr api-gateway
```

2. Перейдите в папку фронтенда:
```bash
cd content-flow/content-flow — копия
```

3. Установите зависимости (если еще не установлены):
```bash
npm install
```

4. Запустите фронтенд:
```bash
npm start
```

5. Фронтенд откроется на `http://localhost:3000`

## 🔍 Проверка подключения

1. Откройте DevTools (F12) → вкладка Network
2. Попробуйте зарегистрироваться или войти
3. Проверьте запросы:
   - URL должен быть: `http://localhost:8080/api/v1/...`
   - Заголовки должны содержать: `Authorization: Bearer <token>`
   - Content-Type: `application/json`

## ⚠️ Важные замечания

1. **Logo в бизнесе**: Бэкенд ожидает base64 строку БЕЗ префикса `data:image/...`, только сам base64. Фронтенд автоматически удаляет префикс перед отправкой.

2. **Goal значения**:
   - `0` = INCREASE_SALES (увеличение продаж)
   - `1` = INCREASE_ENGAGEMENT (увеличение вовлеченности)

3. **Авторизация**: Все запросы (кроме регистрации, логина и подтверждения) требуют заголовок `Authorization: Bearer <access_token>`

4. **Ошибки**: Все сервисы используют единообразную обработку ошибок через `handleResponse()`
