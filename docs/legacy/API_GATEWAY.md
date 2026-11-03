# API Gateway Specification

## Общая информация

Этот документ описывает спецификацию API Gateway для работы с ним, в нем используются python микросервисы.

### Архитектура

- **API Gateway** (порт 8080) - HTTP server


# Регистрация пользователя 

## Endpoint
`POST /api/v1/auth/register`

---

## Назначение

Эндпоинт предназначен для регистрации нового пользователя через API Gateway.


---

## Заголовки запроса

**Headers**

- `Content-Type: application/json`
---

## Тело запроса

```json
{
  "email_token"`: "string",
  "code": 0
}
```

## Ответ

- `200`

## Заголовки ответа

**Headers**

- `Content-Type: application/json`
---

## Тело ответа

```json
{
  "confirmed": false,
  "email_confirm_token": "string",
  "email_message": "string",
  "user_message": "string"
}
```

## Ответ

- `400` Введены некорректные данные со стороны клиента
- `409` Пользователь уже существует
- `500` Внутренняя ошибка со стороны сервера

# Подтверждение почты при регистрации 

## Endpoint
`POST /api/v1/auth/confirm`

---

## Назначение

Эндпоинт предназначен для подтверждении почты нового пользователя через API Gateway.


---

## Заголовки запроса

**Headers**

- `Content-Type: application/json`
---

## Тело запроса

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

## Ответ

- `200`

## Заголовки ответа

**Headers**

- `Content-Type: application/json`
---

## Тело ответа

```json

  {
  "confirmed": false,
  "access_token": "string",
  "refresh_token": "string",
  "user_message": "string"
}

```

## Ответ

- `400` Введены некорректные данные со стороны клиента
- `500` Внутренняя ошибка со стороны сервера

# Логин

## Endpoint
`POST /api/v1/auth/login`

---

## Назначение

Эндпоинт предназначен для авторизации пользователя через API Gateway.


---

## Заголовки запроса

**Headers**

- `Content-Type: application/json`
---

## Тело запроса

```json
{
  "username": "string",
  "password": "string"
}
```

## Ответ

- `200`

## Заголовки ответа

**Headers**

- `Content-Type: application/json`
---

## Тело ответа

```json

  {
  "confirmed": true,
  "access_token": "string",
  "refresh_token": "string",
  "email_confirm_token": "string", - пустая строка
  "user_message": "string"
}

```

## Ответ

- `400` Введены некорректные данные со стороны клиента
- `403` Почта не подтверждена, необходимо подтвердить почту(нужен редирект на `POST /api/v1/auth/confirm`)
## Заголовки ответа

**Headers**

- `Content-Type: application/json`
---

## Тело ответа

```json

  {
  "confirmed": false,
  "access_token": "", - пустая строка
  "refresh_token": "",  - пустая строка
  "email_confirm_token": "string",
  "user_message": "string"
}

```

- `500` Внутренняя ошибка со стороны сервера

# Подтверждение почты при регистрации 

## Endpoint
`POST /api/v1/auth/refresh`

---

## Назначение

Эндпоинт предназначен для обновления access token пользователя через API Gateway.


---

## Заголовки запроса

**Headers**

- `Content-Type: application/json`
---

## Тело запроса

```json
{
  "refresh_token": "string"
}
```

## Ответ

- `200`

## Заголовки ответа

**Headers**

- `Content-Type: application/json`
---

## Тело ответа

```json

{
    "user_message": "string",
    "access_token": "string"
}

```

## Ответ

- `400` Введены некорректные данные со стороны клиента
- `401` Введен невалидный refresh token
- `500` Внутренняя ошибка со стороны сервера
