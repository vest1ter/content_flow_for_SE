# Backend Integration Guide: ContentFlowAI LLM Core

Этот документ описывает, как интегрировать бэкенд с LLM-ядром для генерации маркетингового контента.

## Общая архитектура

LLM-ядро (`ml_core`) предоставляет набор функций для генерации постов и контент-планов через внешние LLM (через OpenRouter). Основные компоненты:

- **LLM-клиент**: абстракция над провайдерами LLM (сейчас OpenRouter)
- **Пайплайны**: готовые функции для генерации контента
- **Схемы**: типизированные модели данных (Pydantic)
- **Промпты**: сборка сообщений для LLM

## Инициализация

### 1. Установка зависимостей
```bash
pip install pydantic requests
```

### 2. Импорт модулей
```python
from ml_core.llm_client import OpenRouterClient
from ml_core.pipelines.content_generation import generate_single_post, generate_content_plan
from ml_core.pipelines.telegram_analysis import generate_posts_from_top_telegram_posts
from ml_core.schemas import (
    BusinessProfile, PostGoal, Platform, Tone,
    SinglePostGenerationRequest, ContentPlanRequest,
    TelegramPost
)
```

### 3. Настройка клиента
```python
# Из переменной окружения OPENROUTER_API_KEY
client = OpenRouterClient()

# Или с явным ключом
client = OpenRouterClient(api_key="your-openrouter-api-key")

# С другой моделью
client = OpenRouterClient(model="anthropic/claude-3-haiku")
```

## Публичные API-функции

### 1. Генерация одного поста

**Функция**: `generate_single_post(client, request, max_tokens=800, temperature=0.7)`

#### Входные данные
- `client`: экземпляр `OpenRouterClient`
- `request`: `SinglePostGenerationRequest` с полями:
  ```python
  SinglePostGenerationRequest(
      business=BusinessProfile(...),  # см. схему ниже
      goal=PostGoal.increase_sales,   # или increase_engagement/awareness/other
      platform=Platform.telegram,     # или vk
      description="Текст описания задачи",  # опционально
      tone_override=Tone.playful,     # опционально
      max_length_chars=500            # опционально
  )
  ```
- `max_tokens`: максимум токенов в ответе (рекомендуется 800-1200)
- `temperature`: креативность (0.6-0.8 для стабильности)

#### Выходные данные
```python
SinglePostGenerationResponse(
    post=GeneratedPost(
        title="Краткий заголовок",  # может быть None
        body="Полный текст поста",
        goal=PostGoal.increase_sales,
        platform=Platform.telegram,
        suggested_hashtags=["#тег1", "#тег2"],
        suggested_image_prompt="Описание для генерации картинки"  # может быть None
    ),
    raw_model_output="Полный JSON-ответ от LLM"  # для отладки
)
```

#### Пример использования
```python
business = BusinessProfile(
    id="biz_001",
    name="Моя компания",
    industry="IT-разработка",
    region="Москва",
    audience_description="Разработчики 25-35 лет",
    description="Разрабатываем мобильные приложения",
    tone=Tone.professional,
    current_reach=10000
)

request = SinglePostGenerationRequest(
    business=business,
    goal=PostGoal.increase_sales,
    platform=Platform.telegram,
    description="Новая услуга: разработка чат-ботов"
)

response = generate_single_post(client, request)
print(response.post.body)  # Текст поста
```

### 2. Генерация контент-плана

**Функция**: `generate_content_plan(client, request, max_tokens=1200, temperature=0.6)`

#### Входные данные
- `client`: экземпляр `OpenRouterClient`
- `request`: `ContentPlanRequest` с полями:
  ```python
  ContentPlanRequest(
      business=BusinessProfile(...),     # см. выше
      goal=PostGoal.increase_engagement,
      platform=Platform.telegram,
      total_posts=7,                      # количество идей
      period_days=14,                     # период в днях
      description="Фокус на новых продуктах"  # опционально
  )
  ```

#### Выходные данные
```python
ContentPlanResponse(
    items=[
        ContentPlanItem(
            planned_date=None,  # заполнит бэкенд
            title="Идея поста 1",
            idea="Подробное описание идеи",
            format="опрос",
            goal=PostGoal.increase_engagement
        ),
        # ... другие идеи
    ],
    raw_model_output="JSON-массив от LLM"
)
```

#### Пример использования
```python
request = ContentPlanRequest(
    business=business,
    goal=PostGoal.increase_engagement,
    platform=Platform.telegram,
    total_posts=5,
    period_days=7,
    description="Продвигать новый курс"
)

response = generate_content_plan(client, request)
for item in response.items:
    print(f"{item.title}: {item.idea}")
```

### 3. Генерация постов на основе выбранных Telegram постов

**Функция**: `generate_posts_from_selected_telegram_posts(client, business, selected_posts, goal, platform, num_new_posts=3)`

#### Входные данные
- `client`: экземпляр `OpenRouterClient`
- `business`: `BusinessProfile`
- `selected_posts`: список `TelegramPost` - **уже отобранные пользователем посты** (бэкенд предоставляет готовый список)
- `goal`: `PostGoal`
- `platform`: `Platform`
- `num_new_posts`: сколько постов сгенерировать (по умолчанию 3)

#### Формат TelegramPost
```python
TelegramPost(
    id="post_123",
    text="Текст поста из Telegram",
    views=1500,           # количество просмотров (опционально, для информации)
    date=datetime.now(),  # дата публикации (опционально)
    link="https://t.me/channel/123"  # опционально
)
```

#### Выходные данные
Список `GeneratedPost` (см. выше в примере генерации одного поста).

#### Пример использования
```python
# Бэкенд уже отобрал топ-посты и пользователь выбрал интересующие
selected_posts = [
    TelegramPost(
        id="1",
        text="Вкусный кофе с корицей! Попробуйте наш новый напиток ☕🍂",
        views=1500,
        date=datetime(2024, 10, 1)
    ),
    TelegramPost(
        id="2",
        text="Сегодня скидка 20% на все десерты! Приходите всей семьей 🎂❤️",
        views=1200,
        date=datetime(2024, 10, 2)
    )
]

new_posts = generate_posts_from_selected_telegram_posts(
    client=client,
    business=business,
    selected_posts=selected_posts,
    goal=PostGoal.increase_engagement,
    platform=Platform.telegram,
    num_new_posts=2
)

for post in new_posts:
    print(f"Заголовок: {post.title}")
    print(f"Текст: {post.body}")
    print(f"Хэштеги: {post.suggested_hashtags}")
```

## Детальные спецификации данных

### Общие правила сериализации

Все объекты Pydantic могут быть преобразованы в JSON с помощью `.model_dump()` и созданы из JSON с помощью `.model_validate(json_dict)`.

```python
# Сериализация в JSON
json_data = business_profile.model_dump()

# Десериализация из JSON
business_profile = BusinessProfile.model_validate(json_data)
```

### Полные схемы данных

#### 1. BusinessProfile (бизнес-профиль)

**Обязательные поля:**
- `id: str` - уникальный идентификатор бизнеса
- `name: str` - название компании
- `industry: str` - сфера деятельности
- `description: str` - подробное описание бизнеса
- `tone: Tone` - стиль коммуникации

**Опциональные поля:**
- `region: str | None` - географический регион
- `audience_description: str | None` - описание целевой аудитории
- `current_reach: int | None` - текущий охват аудитории

**JSON формат:**
```json
{
  "id": "biz_001",
  "name": "DevSolutions",
  "industry": "IT-разработка",
  "description": "Разработка веб-приложений и мобильных приложений. Специализируемся на e-commerce и fintech.",
  "tone": "professional",
  "region": "Санкт-Петербург",
  "audience_description": "Предприниматели, стартапы, средний бизнес 25-45 лет",
  "current_reach": 12000
}
```

**Python создание:**
```python
business = BusinessProfile(
    id="biz_001",
    name="DevSolutions",
    industry="IT-разработка",
    description="Разработка веб-приложений...",
    tone=Tone.professional,
    region="Санкт-Петербург",
    audience_description="Предприниматели...",
    current_reach=12000
)
```

#### 2. TelegramPost (пост из Telegram)

**Обязательные поля:**
- `id: str` - уникальный идентификатор поста
- `text: str` - текст поста
- `date: datetime` - дата публикации

**Опциональные поля:**
- `views: int | None` - количество просмотров
- `link: str | None` - ссылка на пост

**JSON формат:**
```json
{
  "id": "post_123",
  "text": "Вкусный кофе с корицей! Попробуйте наш новый напиток ☕🍂 #кофе #кофейня",
  "date": "2024-10-01T10:30:00Z",
  "views": 1500,
  "link": "https://t.me/coffee/123"
}
```

**Python создание:**
```python
from datetime import datetime

post = TelegramPost(
    id="post_123",
    text="Вкусный кофе с корицей...",
    date=datetime(2024, 10, 1, 10, 30),
    views=1500,
    link="https://t.me/coffee/123"
)
```

#### 3. GeneratedPost (сгенерированный пост)

**Обязательные поля:**
- `body: str` - основной текст поста
- `goal: PostGoal` - цель поста
- `platform: Platform` - платформа публикации

**Опциональные поля:**
- `title: str | None` - заголовок поста
- `suggested_hashtags: List[str]` - список рекомендуемых хэштегов (по умолчанию пустой список)
- `suggested_image_prompt: str | None` - промпт для генерации изображения

**JSON формат:**
```json
{
  "title": "Новый лавандовый латте в кофейне!",
  "body": "Друзья, у нас новинка! Попробуйте наш лавандовый латте - нежный вкус лаванды с бархатистой пенкой ☕💜\n\nЦена: 250 руб.\nВремя работы: 8:00-20:00\nАдрес: ул. Центральная, 15\n\nЖдем вас на чашечку волшебства! #кофе #новинка #лаванда",
  "goal": "increase_engagement",
  "platform": "telegram",
  "suggested_hashtags": ["#кофе", "#новинка", "#лаванда", "#кофейня"],
  "suggested_image_prompt": "Красивая кружка лавандового латте на деревянном столе, пар поднимается вверх, лавандовые цветы рядом, мягкое освещение"
}
```

#### 4. ContentPlanItem (элемент контент-плана)

**Обязательные поля:**
- `title: str` - заголовок идеи
- `idea: str` - подробное описание идеи
- `format: str` - формат контента (например, "пост", "опрос", "кейс-стади")
- `goal: PostGoal` - цель поста

**Опциональные поля:**
- `planned_date: date | None` - планируемая дата публикации

**JSON формат:**
```json
{
  "planned_date": "2024-10-15",
  "title": "История успеха клиента",
  "idea": "Расскажите о том, как ваш продукт помог клиенту увеличить продажи на 40%. Покажите конкретные цифры и результаты.",
  "format": "кейс-стади",
  "goal": "increase_sales"
}
```

### Перечисления (Enums)

#### Tone (стиль коммуникации)
```python
class Tone(str, Enum):
    formal = "formal"      # Формальный, деловой стиль
    friendly = "friendly"  # Дружелюбный, теплый
    professional = "professional"  # Профессиональный
    playful = "playful"    # Игривый, креативный
    expert = "expert"      # Экспертный, авторитетный
```

#### Platform (платформа)
```python
class Platform(str, Enum):
    telegram = "telegram"  # Telegram
    vk = "vk"              # VKontakte
```

#### PostGoal (цель поста)
```python
class PostGoal(str, Enum):
    increase_sales = "increase_sales"        # Увеличение продаж
    increase_engagement = "increase_engagement"  # Увеличение вовлеченности
    increase_awareness = "increase_awareness"    # Повышение узнаваемости
    other = "other"                        # Другая цель
```

### Запросы и ответы API

#### SinglePostGenerationRequest
```json
{
  "business": {
    "id": "biz_001",
    "name": "DevSolutions",
    "industry": "IT-разработка",
    "description": "Разработка веб-приложений...",
    "tone": "professional",
    "region": "Санкт-Петербург",
    "audience_description": "Предприниматели...",
    "current_reach": 12000
  },
  "goal": "increase_sales",
  "platform": "telegram",
  "description": "Новая услуга: разработка мобильных приложений под ключ",
  "tone_override": "expert",
  "max_length_chars": 800
}
```

#### SinglePostGenerationResponse
```json
{
  "post": {
    "title": "Мобильная разработка под ключ",
    "body": "В DevSolutions мы запустили услугу полной разработки мобильных приложений...\n\nПодробности: https://devsolutions.ru/mobile",
    "goal": "increase_sales",
    "platform": "telegram",
    "suggested_hashtags": ["#мобильнаяразработка", "#ios", "#android"],
    "suggested_image_prompt": "Скриншоты мобильного приложения на смартфонах разных моделей"
  },
  "raw_model_output": "{\"title\": \"Мобильная разработка...\", \"body\": \"В DevSolutions...\", \"suggested_hashtags\": [...], \"suggested_image_prompt\": \"...\"}"
}
```

#### ContentPlanRequest
```json
{
  "business": {
    "id": "biz_001",
    "name": "DevSolutions",
    "industry": "IT-разработка",
    "description": "Разработка веб-приложений...",
    "tone": "professional"
  },
  "goal": "increase_engagement",
  "platform": "telegram",
  "total_posts": 7,
  "period_days": 14,
  "description": "Фокус на кейсах и технологиях"
}
```

#### ContentPlanResponse
```json
{
  "items": [
    {
      "title": "Технологии 2024",
      "idea": "Обзор трендов веб-разработки в 2024 году",
      "format": "образовательный пост",
      "goal": "increase_engagement"
    },
    {
      "title": "Кейс интернет-магазина",
      "idea": "Как мы увеличили конверсию на 35%",
      "format": "кейс-стади",
      "goal": "increase_sales"
    }
  ],
  "raw_model_output": "[{\"title\": \"Технологии 2024\", \"idea\": \"Обзор...\", \"format\": \"...\", \"goal\": \"...\"}, ...]"
}
```

### Правила валидации

#### Обязательные поля
- Все идентификаторы (`id`) должны быть непустыми строками
- Тексты не должны быть пустыми
- Перечисления должны соответствовать допустимым значениям

#### Ограничения длины
- `title`: максимум 200 символов
- `body`: максимум 4000 символов (для одного поста)
- `description`: максимум 1000 символов
- `name`: максимум 100 символов

#### Форматы дат
- Все даты передаются в ISO формате: `YYYY-MM-DDTHH:MM:SSZ`
- Пример: `"2024-10-01T10:30:00Z"`

### Обработка ошибок

#### Типы ошибок
1. **ValueError**: неправильные входные данные
   - Несуществующее значение enum
   - Пустые обязательные поля
   - Превышение лимитов длины

2. **ValidationError (Pydantic)**: несоответствие схеме
   - Неверный тип данных
   - Отсутствующие обязательные поля

3. **RuntimeError**: ошибка внешнего API
   - Проблемы с OpenRouter API
   - Таймауты
   - Лимиты токенов

#### Примеры обработки
```python
from pydantic import ValidationError

try:
    response = generate_single_post(client, request)
except ValidationError as e:
    # Ошибка валидации данных
    print(f"Validation error: {e}")
    # Вернуть пользователю понятное сообщение
except ValueError as e:
    # Бизнес-логика ошибка
    print(f"Business logic error: {e}")
except RuntimeError as e:
    # API ошибка - можно повторить
    print(f"API error: {e}")
    # Повторить через 5 секунд
```

### Сериализация для HTTP API

Если бэкенд использует JSON API, вот примеры запросов/ответов:

#### POST /api/generate-post
```json
{
  "business": {
    "id": "biz_001",
    "name": "DevSolutions",
    "industry": "IT-разработка",
    "description": "Разработка веб-приложений",
    "tone": "professional"
  },
  "goal": "increase_sales",
  "platform": "telegram",
  "description": "Новая услуга разработки"
}
```

#### Response 200
```json
{
  "success": true,
  "data": {
    "post": {
      "title": "Новая услуга разработки",
      "body": "В DevSolutions мы...",
      "goal": "increase_sales",
      "platform": "telegram",
      "suggested_hashtags": ["#разработка"],
      "suggested_image_prompt": "Код на экране"
    }
  }
}
```

#### Response 400 (ошибка валидации)
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Invalid business tone",
    "details": {
      "field": "business.tone",
      "expected": ["formal", "friendly", "professional", "playful", "expert"],
      "received": "casual"
    }
  }
}
```

#### Response 500 (API ошибка)
```json
{
  "success": false,
  "error": {
    "type": "api_error",
    "message": "OpenRouter API unavailable",
    "retry_after": 30
  }
}
```

## Обработка ошибок

Все функции могут выбросить исключения:

- `ValueError`: неправильные входные данные или невалидный JSON от LLM
- `RuntimeError`: ошибка API OpenRouter (таймаут, лимиты и т.д.)
- `ValidationError` (Pydantic): несоответствие схемам

Рекомендуется оборачивать вызовы в try-except:

```python
try:
    response = generate_single_post(client, request)
except RuntimeError as e:
    # Ошибка API - можно повторить позже
    print(f"API Error: {e}")
except ValueError as e:
    # Проблема с данными или парсингом
    print(f"Data Error: {e}")
```

## Производственные рекомендации

1. **Кэширование**: LLM-вызовы дорогие, кэшируйте результаты по хэшу входных данных
2. **Ретраи**: при API-ошибках добавьте повторные попытки с экспоненциальной задержкой
3. **Валидация**: всегда проверяйте входные данные перед вызовом функций
4. **Мониторинг**: логируйте `raw_model_output` для анализа качества
5. **Лимиты**: контролируйте использование токенов через `max_tokens`
6. **Асинхронность**: если бэкенд асинхронный, обернёте вызовы в `asyncio.to_thread()`

## Тестирование

Для тестирования используйте `test_integration.py`:

```bash
python test_integration.py  # все тесты
python test_integration.py 1  # конкретный тест
```

## Контакты

Для вопросов по интеграции обращайтесь к разработчику LLM-части.
