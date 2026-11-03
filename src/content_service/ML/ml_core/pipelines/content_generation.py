from __future__ import annotations
import json
from typing import List
from pydantic import ValidationError
from logging import getLogger
import logging
logging.basicConfig(level=logging.DEBUG)
logger = getLogger(__name__)

from ..schemas import (
    BusinessProfile,
    Platform,
    PostGoal,
    SinglePostGenerationRequest,
    SinglePostGenerationResponse,
    GeneratedPost,
    ContentPlanRequest,
    ContentPlanResponse,
    ContentPlanItem,
)
from ..llm_client import LLMClient
from ..prompts import (
    build_single_post_messages,
    build_content_plan_messages,
)
from ..utils import safe_json_parse

def generate_single_post(
    llm: LLMClient,
    req: SinglePostGenerationRequest,
    max_tokens: int = 800,
    temperature: float = 0.7,
) -> SinglePostGenerationResponse:
    """
    Основной пайплайн генерации одного поста.
    """
    messages = build_single_post_messages(
        business=req.business,
        goal=req.goal,
        platform=req.platform,
        user_description=req.description,
        tone_override=req.tone_override.value if req.tone_override else None,
        max_length_chars=req.max_length_chars,
    )
    raw = llm.generate(messages, max_tokens=max_tokens, temperature=temperature)

    try:
        data = safe_json_parse(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM вернул невалидный JSON: {e}. raw={raw!r}")

    try:
        post = GeneratedPost(
            title=data.get("title"),
            body=data["body"],
            goal=req.goal,
            platform=req.platform,
            suggested_hashtags=data.get("suggested_hashtags") or [],
            suggested_image_prompt=data.get("suggested_image_prompt"),
        )
    except (KeyError, ValidationError) as e:
        raise ValueError(f"Ошибка при маппинге ответа LLM в схему: {e}")
    
    logger.debug(f"сингл пост готов {post}")

    return SinglePostGenerationResponse(post=post, raw_model_output=raw)


def generate_content_plan(
    llm: LLMClient,
    req: ContentPlanRequest,
    max_tokens: int = 1200,
    temperature: float = 0.6,
) -> ContentPlanResponse:
    """
    Генерация идей для контент-плана.
    """
    messages = build_content_plan_messages(req)
    raw = llm.generate(messages, max_tokens=max_tokens, temperature=temperature)
    
    logger.debug(f"📥 [Content Plan] Raw LLM response (first 500 chars): {raw[:500]}")
    
    try:
        data = safe_json_parse(raw)
    except json.JSONDecodeError as e:
        logger.error(f"❌ [Content Plan] Failed to parse JSON. Error: {e}")
        logger.error(f"❌ [Content Plan] Raw response (first 1000 chars): {raw[:1000]}")
        raise ValueError(f"LLM вернул невалидный JSON (content plan): {e}. raw={raw[:500]!r}...")

    # Обрабатываем случаи, когда LLM возвращает dict вместо list
    if isinstance(data, dict):
        logger.warning(f"⚠️ [Content Plan] LLM вернул dict вместо list. Data keys: {list(data.keys())}")
        # Пытаемся найти список в dict
        if "items" in data and isinstance(data["items"], list):
            logger.info("✅ [Content Plan] Найден список в поле 'items'")
            data = data["items"]
        elif "posts" in data and isinstance(data["posts"], list):
            logger.info("✅ [Content Plan] Найден список в поле 'posts'")
            data = data["posts"]
        elif "content_plan" in data and isinstance(data["content_plan"], list):
            logger.info("✅ [Content Plan] Найден список в поле 'content_plan'")
            data = data["content_plan"]
        else:
            raise ValueError(f"Ожидали список объектов для контент-плана, получили dict без списка. Keys: {list(data.keys())}")

    if not isinstance(data, list):
        raise ValueError(f"Ожидали список объектов для контент-плана, получили: {type(data)}. data={str(data)[:200]}")

    if len(data) == 0:
        raise ValueError("LLM вернул пустой список постов для контент-плана")

    logger.info(f"✅ [Content Plan] Получено {len(data)} элементов контент-плана")

    items: List[ContentPlanItem] = []
    for i, item in enumerate(data):
        try:
            # Обрабатываем случаи, когда goal может быть числом или строкой
            goal_str = item.get("goal", "increase_engagement") if isinstance(item, dict) else "increase_engagement"
            if isinstance(goal_str, int):
                # Если goal - число, преобразуем в строку
                goal_map = {0: "increase_sales", 1: "increase_engagement", 2: "increase_awareness", 3: "other"}
                goal_str = goal_map.get(goal_str, "increase_engagement")
            
            cp_item = ContentPlanItem(
                planned_date=None,  # заполняет backend
                title=item.get("title", f"Идея {i+1}"),
                idea=item.get("idea", item.get("content", "")),
                format=item.get("format", "post"),
                goal=PostGoal(goal_str),
            )
            items.append(cp_item)
        except (KeyError, ValidationError, ValueError) as e:
            logger.error(f"❌ [Content Plan] Ошибка в элементе #{i}: {e}. item={item!r}")
            raise ValueError(f"Ошибка в элементе контент-плана #{i}: {e}. item={item!r}")

    logger.info(f"✅ [Content Plan] Успешно обработано {len(items)} элементов контент-плана")
    logger.debug(f"✅ [Content Plan] Raw model output: {items}")
    return ContentPlanResponse(items=items, raw_model_output=raw)