from datetime import datetime, timezone
from uuid import uuid4
from uuid import UUID as PyUUID

from sqlalchemy import (
    String,
    Text,
    TIMESTAMP,
    JSON,
    Integer,
)
import enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)

from database.db_helper import db_helper


class Base(DeclarativeBase):
    pass


# ======================================
#               POSTS
# ======================================

class PostType(str, enum.Enum):
    """Тип поста"""
    TELEGRAM_GENERATED = "telegram_generated"  # Сгенерирован из Telegram постов
    BUSINESS_GENERATED = "business_generated"  # Сгенерирован для бизнеса


class PostGoal(str, enum.Enum):
    """Цель поста"""
    INCREASE_SALES = "increase_sales"
    INCREASE_ENGAGEMENT = "increase_engagement"
    AWARENESS = "awareness"
    OTHER = "other"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    # Основная информация
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    business_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Тип и платформа
    post_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # PostType enum как строка
    platform: Mapped[str] = mapped_column(String(50), nullable=False, default="Telegram")
    
    # Содержимое поста
    post_text: Mapped[str] = mapped_column(Text, nullable=False)  # Сгенерированный текст поста
    
    # Параметры генерации (для бизнес-постов)
    goal: Mapped[str | None] = mapped_column(String(50), nullable=True)  # PostGoal enum как строка
    tone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # Описание для бизнес-постов
    
    # Дополнительные данные (JSON)
    source_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Для хранения выбранных постов из Telegram и другой метаинформации
    
    # Метаданные
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )


# ======================================
#           CONTENT PLANS
# ======================================

class ContentPlan(Base):
    __tablename__ = "content_plans"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    # Основная информация
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    business_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Параметры генерации
    goal: Mapped[str] = mapped_column(String(50), nullable=False)  # PostGoal enum как строка
    total_posts: Mapped[int] = mapped_column(Integer, nullable=False)  # Количество идей в плане
    period_days: Mapped[int] = mapped_column(Integer, nullable=False)  # Период в днях
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # Описание фокуса
    
    # Сгенерированные идеи (JSON массив ContentPlanItem)
    items: Mapped[list] = mapped_column(JSON, nullable=False)  # Список идей контент-плана
    
    # Метаданные
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )


def create_tables() -> None:
    with db_helper.engine.begin() as conn:
        Base.metadata.create_all(bind=conn)


create_tables()