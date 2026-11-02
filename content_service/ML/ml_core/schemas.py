from __future__ import annotations
from typing import List, Optional, Literal
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field


class Tone(str, Enum):
    formal = "formal"
    friendly = "friendly"
    professional = "professional"
    playful = "playful"
    expert = "expert"


class Platform(str, Enum):
    telegram = "telegram"
    vk = "vk"


class PostGoal(str, Enum):
    increase_sales = "increase_sales"
    increase_engagement = "increase_engagement"
    increase_awareness = "increase_awareness"
    other = "other"


class BusinessProfile(BaseModel):
    id: str
    name: str
    industry: str = Field(..., description="Сфера деятельности")
    region: Optional[str] = None
    audience_description: Optional[str] = None
    current_reach: Optional[int] = Field(
        None, description="Текущий охват, если есть"
    )
    description: str
    tone: Tone = Tone.professional


class TelegramPost(BaseModel):
    id: str
    text: str
    views: int
    date: datetime
    link: Optional[str] = None


class GeneratedPost(BaseModel):
    title: Optional[str] = None
    body: str
    goal: PostGoal
    platform: Platform
    suggested_hashtags: List[str] = Field(default_factory=list)
    suggested_image_prompt: Optional[str] = None


class SinglePostGenerationRequest(BaseModel):
    business: BusinessProfile
    goal: PostGoal
    platform: Platform
    description: Optional[str] = Field(
        None,
        description="Свободное описание задачи пользователем (pain/offer/акция и т.п.)"
    )
    tone_override: Optional[Tone] = None
    max_length_chars: Optional[int] = Field(
        None, description="Желаемая длина поста в символах"
    )


class SinglePostGenerationResponse(BaseModel):
    post: GeneratedPost
    raw_model_output: Optional[str] = Field(
        None, description="Полный сырой ответ модели, для отладки"
    )


class ContentPlanItem(BaseModel):
    # Даты может проставлять backend, но здесь оставим для удобства
    planned_date: Optional[date] = None
    title: str
    idea: str
    format: str  # например, 'пост', 'сторис', 'опрос'
    goal: PostGoal


class ContentPlanRequest(BaseModel):
    business: BusinessProfile
    goal: PostGoal
    platform: Platform
    total_posts: int
    period_days: int
    description: Optional[str] = None


class ContentPlanResponse(BaseModel):
    items: List[ContentPlanItem]
    raw_model_output: Optional[str] = None


class RewriteRequest(BaseModel):
    original_text: str
    instructions: str
    business: Optional[BusinessProfile] = None
    platform: Optional[Platform] = None


class RewriteResponse(BaseModel):
    rewritten_text: str
    raw_model_output: Optional[str] = None


class RecommendationsRequest(BaseModel):
    business: BusinessProfile
    platform: Platform
    sample_posts: List[TelegramPost] = Field(
        default_factory=list,
        description="Исторические посты для анализа (можно пустой список)"
    )
    goal: Optional[PostGoal] = None


class RecommendationsResponse(BaseModel):
    text_recommendations: str
    raw_model_output: Optional[str] = None
