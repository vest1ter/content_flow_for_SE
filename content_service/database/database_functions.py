from sqlalchemy.orm import Session
from sqlalchemy import select
from models.models import Post, PostType, PostGoal, ContentPlan
from datetime import datetime, timezone
import uuid
from typing import Optional, Dict, Any, List


def add_generated_post_to_db(
    session: Session,
    user_id: uuid.UUID,
    post_text: str,
    post_type: PostType,
    platform: str = "Telegram",
    business_id: Optional[uuid.UUID] = None,
    goal: Optional[PostGoal] = None,
    tone: Optional[str] = None,
    description: Optional[str] = None,
    source_data: Optional[Dict[str, Any]] = None,
) -> uuid.UUID:
    """
    Добавляет сгенерированный пост в базу данных
    
    Args:
        user_id: ID пользователя
        post_text: Текст сгенерированного поста
        post_type: Тип поста (TELEGRAM_GENERATED или BUSINESS_GENERATED)
        platform: Платформа (по умолчанию "Telegram")
        business_id: ID бизнеса (если пост создан для бизнеса)
        goal: Цель поста (для бизнес-постов)
        tone: Тон поста (опционально)
        description: Описание поста (для бизнес-постов)
        source_data: Дополнительные данные в формате JSON (например, выбранные посты из Telegram)
        session: SQLAlchemy сессия
    
    Returns:
        UUID созданного поста
    """
    post_id = uuid.uuid4()
    
    # Конвертируем enum в строку для сохранения
    post_type_str = post_type.value if isinstance(post_type, PostType) else post_type
    goal_str = goal.value if goal and isinstance(goal, PostGoal) else (goal if goal else None)
    
    post = Post(
        id=post_id,
        user_id=user_id,
        business_id=business_id,
        post_type=post_type_str,
        platform=platform,
        post_text=post_text,
        goal=goal_str,
        tone=tone,
        description=description,
        source_data=source_data,
        created_at=datetime.now(timezone.utc)
    )
    
    session.add(post)
    session.commit()
    return post_id


def add_content_plan_to_db(
    session: Session,
    user_id: uuid.UUID,
    items: List[Dict[str, Any]],
    goal: PostGoal,
    total_posts: int,
    period_days: int,
    business_id: Optional[uuid.UUID] = None,
    description: Optional[str] = None,
) -> uuid.UUID:
    """
    Добавляет сгенерированный контент-план в базу данных
    
    Args:
        session: SQLAlchemy сессия
        user_id: ID пользователя
        items: Список идей контент-плана (ContentPlanItem)
        goal: Цель контент-плана
        total_posts: Количество идей в плане
        period_days: Период в днях
        business_id: ID бизнеса (если план создан для бизнеса)
        description: Описание фокуса (опционально)
    
    Returns:
        UUID созданного контент-плана
    """
    plan_id = uuid.uuid4()
    
    # Конвертируем enum в строку для сохранения
    goal_str = goal.value if isinstance(goal, PostGoal) else goal
    
    content_plan = ContentPlan(
        id=plan_id,
        user_id=user_id,
        business_id=business_id,
        goal=goal_str,
        total_posts=total_posts,
        period_days=period_days,
        description=description,
        items=items,
        created_at=datetime.now(timezone.utc)
    )
    
    session.add(content_plan)
    session.commit()
    return plan_id


def get_content_plan_by_id(
    session: Session,
    plan_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Optional[ContentPlan]:
    """
    Получает контент-план по ID (только если он принадлежит пользователю)
    
    Args:
        session: SQLAlchemy сессия
        plan_id: ID контент-плана
        user_id: ID пользователя
    
    Returns:
        ContentPlan или None если не найден
    """
    stmt = select(ContentPlan).where(
        ContentPlan.id == plan_id,
        ContentPlan.user_id == user_id
    )
    result = session.execute(stmt).scalar_one_or_none()
    return result


def get_content_plans_by_user_id(
    session: Session,
    user_id: uuid.UUID,
    business_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[ContentPlan]:
    """
    Получает список контент-планов пользователя
    
    Args:
        session: SQLAlchemy сессия
        user_id: ID пользователя
        business_id: ID бизнеса (опционально, для фильтрации)
        limit: Максимальное количество результатов
        offset: Смещение для пагинации
    
    Returns:
        Список ContentPlan
    """
    stmt = select(ContentPlan).where(ContentPlan.user_id == user_id)
    
    if business_id:
        stmt = stmt.where(ContentPlan.business_id == business_id)
    
    stmt = stmt.order_by(ContentPlan.created_at.desc()).limit(limit).offset(offset)
    result = session.execute(stmt).scalars().all()
    return list(result)



