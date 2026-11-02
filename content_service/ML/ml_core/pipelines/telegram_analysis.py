from __future__ import annotations
from typing import List
from datetime import datetime, timedelta
import json

from pydantic import ValidationError
from logging import getLogger
import logging
logging.basicConfig(level=logging.DEBUG)
logger = getLogger(__name__)

from ..schemas import (
    BusinessProfile,
    TelegramPost,
    Platform,
    PostGoal,
    GeneratedPost,
)
from ..llm_client import LLMClient, ChatMessage
from ..utils import safe_json_parse

def select_top_posts(
    posts: List[TelegramPost],
    limit: int = 5,
    decay_days: int = 30,
) -> List[TelegramPost]:
    """
    Отбираем самые популярные посты с учётом давности.
    """
    if not posts:
        return []

    now = max(p.date for p in posts)
    scored = []
    for p in posts:
        age_days = max((now - p.date).days, 0)
        decay = 0.5 ** (age_days / decay_days) if decay_days > 0 else 1.0
        score = p.views * decay
        scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]


def _build_messages_for_generation_from_top_posts(
    business: BusinessProfile,
    top_posts: List[TelegramPost],
    goal: PostGoal,
    platform: Platform,
    num_new_posts: int,
) -> List[ChatMessage]:
    system_content = (
        "Ты — опытный маркетолог и копирайтер по Telegram/VK. "
        "Ты анализируешь самые успешные посты и придумываешь новые идеи в похожем стиле, "
        "избегая прямого копирования, чтобы сохранить оригинальность."
    )

    top_posts_text = "\n\n".join(
        f"Пост #{i+1} (просмотры: {p.views}):\n{p.text}"
        for i, p in enumerate(top_posts)
    )

    business_ctx = (
        f"Название: {business.name}\n"
        f"Сфера деятельности: {business.industry}\n"
        f"Регион: {business.region or 'не указан'}\n"
        f"Описание бизнеса: {business.description}\n"
        f"Целевая аудитория: {business.audience_description or 'не указана'}\n"
        f"Стиль коммуникации: {business.tone.value}\n"
    )

    user_content = f"""
Контекст бизнеса:
{business_ctx}

Популярные посты:
{top_posts_text}

Цель новых постов: {goal.value}
Платформа: {platform.value}
Количество новых постов: {num_new_posts}

Сгенерируй {num_new_posts} новых постов в духе этих успешных публикаций, но без прямого копирования текста.
Сохраняй тематику, глубину и стиль, усиливай сильные стороны.

Верни ответ строго в JSON-формате — список объектов:

[
  {{
    "title": "краткий заголовок",
    "body": "полный текст поста",
    "suggested_hashtags": ["#пример"],
    "suggested_image_prompt": "описание изображения"
  }},
  ...
]
    """.strip()

    return [
        ChatMessage(role="system", content=system_content),
        ChatMessage(role="user", content=user_content),
    ]


def generate_posts_from_selected_telegram_posts(
    llm: LLMClient,
    business: BusinessProfile,
    selected_posts: List[TelegramPost],
    goal: PostGoal,
    platform: Platform,
    num_new_posts: int = 3,
) -> List[GeneratedPost]:
    """
    Генерация новых постов на основе выбранных пользователем постов из Telegram.
    Бэкенд уже предоставляет отобранные посты, без дополнительного анализа.
    """
    if not selected_posts:
        raise ValueError("Не переданы посты для анализа Telegram-канала")

    messages = _build_messages_for_generation_from_top_posts(
        business=business,
        top_posts=selected_posts,  # используем переданные посты как "топ"
        goal=goal,
        platform=platform,
        num_new_posts=num_new_posts,
    )

    raw = llm.generate(messages, max_tokens=1600, temperature=0.7)

    # Используем безопасный парсинг
    try:
        data = safe_json_parse(raw)
        logger.debug(f"Parsed JSON from LLM: type={type(data)}, is_list={isinstance(data, list)}")
        if isinstance(data, dict):
            logger.warning(f"LLM вернул dict вместо list. Data: {data}")
            # Пытаемся найти список постов в dict
            if "posts" in data and isinstance(data["posts"], list):
                logger.info("Найден список постов в поле 'posts', используем его")
                data = data["posts"]
            elif "items" in data and isinstance(data["items"], list):
                logger.info("Найден список постов в поле 'items', используем его")
                data = data["items"]
            else:
                # Если это dict с одним постом, преобразуем в список
                if "body" in data or "title" in data:
                    logger.info("Найден один пост в dict, преобразуем в список")
                    data = [data]
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM вернул невалидный JSON (telegram generation): {e}. raw={raw!r}")

    if not isinstance(data, list):
        raise ValueError(f"Ожидали список постов, получили: {type(data)}, data={data!r}")

    result: List[GeneratedPost] = []
    for i, item in enumerate(data[:num_new_posts]):
        try:
            post = GeneratedPost(
                title=item.get("title"),
                body=item["body"],
                platform=platform,
                goal=goal,
                suggested_hashtags=item.get("suggested_hashtags") or [],
                suggested_image_prompt=item.get("suggested_image_prompt"),
            )
            result.append(post)
        except (KeyError, ValidationError) as e:
            raise ValueError(f"Ошибка в сгенерированном посте #{i}: {e}. item={item!r}")
    logger.debug(f"тг пост готов {result}")
    return result


def generate_posts_from_top_telegram_posts(
    llm: LLMClient,
    business: BusinessProfile,
    posts: List[TelegramPost],
    goal: PostGoal,
    platform: Platform,
    num_new_posts: int = 3,
    top_limit: int = 5,
) -> List[GeneratedPost]:
    """
    Устаревшая функция. Используйте generate_posts_from_selected_telegram_posts.
    Высокоуровневый пайплайн с автоматическим выбором топ-постов.
    """
    top_posts = select_top_posts(posts, limit=top_limit)
    return generate_posts_from_selected_telegram_posts(
        llm=llm,
        business=business,
        selected_posts=top_posts,
        goal=goal,
        platform=platform,
        num_new_posts=num_new_posts,
    )