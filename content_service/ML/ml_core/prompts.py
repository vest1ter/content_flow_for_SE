from __future__ import annotations
from typing import List
from .schemas import (
    BusinessProfile,
    Platform,
    PostGoal,
    ContentPlanRequest,
)
from ml_core.llm_client import ChatMessage


def _business_context_text(b: BusinessProfile) -> str:
    parts = [
        f"Название: {b.name}",
        f"Сфера деятельности: {b.industry}",
        f"Регион: {b.region or 'не указан'}",
        f"Описание бизнеса: {b.description}",
        f"Описание целевой аудитории: {b.audience_description or 'не указано'}",
        f"Текущий охват: {b.current_reach or 'не указан'}",
        f"Стиль коммуникации: {b.tone.value}",
    ]
    return "\n".join(parts)


def build_single_post_messages(
    business: BusinessProfile,
    goal: PostGoal,
    platform: Platform,
    user_description: str | None,
    tone_override: str | None,
    max_length_chars: int | None,
) -> List[ChatMessage]:
    system_content = (
        "Ты — опытный маркетолог и копирайтер, который пишет продающие и вовлекающие "
        "посты для соцсетей (Telegram, VK). "
        "Всегда соблюдай структуру, понятный язык и учитывай стиль бренда."
    )

    business_ctx = _business_context_text(business)
    tone_part = (
        f"Используй стиль: {tone_override}."
        if tone_override
        else f"Используй стиль бренда: {business.tone.value}."
    )
    length_part = (
        f"Максимальная длина поста: {max_length_chars} символов."
        if max_length_chars
        else "Длина поста — средняя: 800–1200 символов."
    )

    user_content = f"""
Контекст бизнеса:
{business_ctx}

Цель поста: {goal.value}
Платформа: {platform.value}
{tone_part}
{length_part}

Дополнительное описание задачи от пользователя:
{user_description or "нет"}

Сгенерируй один пост и верни результат строго в формате JSON без комментариев и лишнего текста:

{{
  "title": "краткий цепляющий заголовок (может быть пустой строкой)",
  "body": "основной текст поста",
  "suggested_hashtags": ["#пример", "#бизнес"]
  }}
"""

    return [
        ChatMessage(role="system", content=system_content),
        ChatMessage(role="user", content=user_content),
    ]


def build_content_plan_messages(
    req: ContentPlanRequest,
) -> List[ChatMessage]:
    system_content = (
        "Ты — опытный контент-стратег. "
        "Твоя задача — составить контент-план с идеями постов для указанных целей."
    )

    business_ctx = _business_context_text(req.business)

    user_content = f"""
Контекст бизнеса:
{business_ctx}

Цель контент-плана: {req.goal.value}
Платформа: {req.platform.value}
Количество постов: {req.total_posts}
Период в днях: {req.period_days}

Дополнительное описание от пользователя:
{req.description or "нет"}

Составь список идей постов (без дат), равный количеству постов.
Каждый элемент списка должен описывать одну идею.

ВАЖНО: Верни ТОЛЬКО валидный JSON массив, без дополнительного текста, без объяснений, без форматирования в markdown.
Начни ответ сразу с квадратной скобки [ и закончи квадратной скобкой ].

Формат ответа (ТОЛЬКО JSON):

[
  {{
    "title": "краткий заголовок поста",
    "idea": "подробное описание идеи поста",
    "format": "формат контента (например, 'обучающий пост', 'кейсы', 'опрос')",
    "goal": "increase_sales"
  }}
]

Начни ответ прямо сейчас с [:
"""

    return [
        ChatMessage(role="system", content=system_content),
        ChatMessage(role="user", content=user_content),
    ]
