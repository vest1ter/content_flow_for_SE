# ContentFlowAI ML Core

ML-ядро для генерации маркетингового контента с использованием LLM.

## Установка и настройка

### 1. Установка зависимостей
```bash
pip install -r requirements.txt
```

**Важно:** Установите `python-dotenv` для автоматической загрузки переменных из `.env` файла:
```bash
pip install python-dotenv
```

### 2. Настройка API ключа
```bash
# Скопируйте пример файла окружения
cp env.example .env

# Отредактируйте .env файл и добавьте ваш OpenRouter API ключ
# OPENROUTER_API_KEY=your-actual-api-key-here
```

**Получение API ключа:**
1. Зарегистрируйтесь на [OpenRouter.ai](https://openrouter.ai/)
2. Получите API ключ в личном кабинете
3. Добавьте его в переменную `OPENROUTER_API_KEY`

### 3. Альтернативная настройка через переменные окружения
```bash
# Linux/Mac
export OPENROUTER_API_KEY=your-api-key

# Windows PowerShell
$env:OPENROUTER_API_KEY="your-api-key"

# Windows CMD
set OPENROUTER_API_KEY=your-api-key
```

## Использование

```python
from ml_core import OpenRouterClient, generate_single_post
from ml_core.schemas import BusinessProfile, PostGoal, Platform, Tone

# Настройка клиента
client = OpenRouterClient()  # Использует OPENROUTER_API_KEY из переменных окружения

# Создание бизнес-профиля
business = BusinessProfile(
    id="biz_001",
    name="My Company",
    industry="IT",
    description="Software development company",
    tone=Tone.professional
)

# Генерация поста
from ml_core.pipelines.content_generation import generate_single_post
from ml_core.schemas import SinglePostGenerationRequest

request = SinglePostGenerationRequest(
    business=business,
    goal=PostGoal.increase_sales,
    platform=Platform.telegram,
    description="New product launch"
)

response = generate_single_post(client, request)
print(response.post.body)
```

## API

### Основные функции

- `generate_single_post()` - генерация одного поста
- `generate_content_plan()` - генерация контент-плана
- `generate_posts_from_selected_telegram_posts()` - генерация постов на основе выбранных Telegram постов

### Документация

Подробная документация API находится в `backend_integration_guide.md`.

## Тестирование

```bash
# Все тесты (требуется API ключ)
python test_integration.py

# Конкретный тест
python test_integration.py 1
```

## Безопасность

- Никогда не коммитьте API ключи в репозиторий
- Используйте переменные окружения или `.env` файлы для чувствительных данных
- Все секреты исключены из git через `.gitignore`
- Не делитесь файлом `.env` с коллегами