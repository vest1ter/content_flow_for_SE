# Настройка фронтенда для подключения к бэкенду

## ✅ Проверка конфигурации

Конфигурация уже настроена правильно! 

- ✅ API Gateway работает на порту `8080`
- ✅ В `src/api/config.js` указан `BASE_URL: 'http://localhost:8080'`
- ✅ В `package.json` настроен `proxy: "http://localhost:8080"`
- ✅ Все сервисы используют `API_CONFIG.getFullUrl()` для формирования URL

## Шаг 1: Найти папку с фронтендом

Папка с фронтендом находится в `content-flow/content-flow—атАФ ╨║╨╛╨┐╨╕╤П/`

**Примечание:** Если нужно, можно переименовать папку для удобства.

## Шаг 2: Установить зависимости

Если зависимости еще не установлены, выполните:

```bash
# Перейти в папку фронтенда
cd content-flow/content-flow—атАФ ╨║╨╛╨┐╨╕╤П

# Установить зависимости
npm install
```

## Шаг 3: Запустить фронтенд

```bash
# Запустить в режиме разработки
npm start
```

Фронтенд автоматически откроется в браузере на `http://localhost:3000`

## Шаг 4: Проверить подключение

После запуска фронтенд будет доступен на `http://localhost:3000` (стандартный порт React).

### Проверка в браузере

1. Откройте DevTools (F12) → вкладка Network
2. Попробуйте зарегистрироваться или войти
3. Проверьте, что запросы идут на правильный адрес:
   - ✅ `http://localhost:8080/api/v1/auth/register`
   - ✅ `http://localhost:8080/api/v1/auth/login`
   - ✅ `http://localhost:8080/api/v1/business/create`

### Проверка статуса бэкенда

Убедитесь, что API Gateway запущен:
```bash
docker ps | findstr api-gateway
```

Должен быть виден контейнер `pp2-api-gateway-1` на порту `8080`

## Возможные проблемы

### CORS ошибки
API Gateway уже настроен на разрешение всех источников (`AllowOrigins: []string{"*"}`), поэтому CORS не должен быть проблемой.

Если все равно возникают CORS ошибки, проверьте:
1. API Gateway запущен и доступен на порту 8080
2. В консоли браузера нет ошибок подключения

### API Gateway не отвечает

**Проверить статус:**
```bash
docker ps | findstr api-gateway
```

**Проверить логи:**
```bash
docker logs pp2-api-gateway-1
```

**Перезапустить API Gateway:**
```bash
docker restart pp2-api-gateway-1
```

### Изменить порт API Gateway

Если нужно изменить порт, обновите файл `src/api/config.js`:
```javascript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:ВАШ_ПОРТ',  // Изменить здесь
  API_VERSION: '/api/v1',
  // ...
};
```

### Проблемы с установкой зависимостей

Если `npm install` не работает, попробуйте:
```bash
# Очистить кеш
npm cache clean --force

# Удалить node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановить
npm install
```
