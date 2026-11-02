from sqlalchemy import String, Integer, Enum, DateTime, Text, Boolean, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import enum
from datetime import datetime
import uuid
from uuid import UUID as PyUUID
from sqlalchemy.dialects.postgresql import UUID

from database.db_helper import db_helper


class CommunicationStyleEnum(str, enum.Enum):
    FORMAL = "formal"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"


class Base(DeclarativeBase):
    pass


class BusinessModel(Base):
    __tablename__ = "businesses"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)  # ID пользователя из JWT

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(255), nullable=False)  # сфера деятельности
    audience_reach: Mapped[str | None] = mapped_column(String(100))     # охват аудитории (опционально)
    region: Mapped[str | None] = mapped_column(String(100))              # регион (опционально)
    description: Mapped[str | None] = mapped_column(Text)                # описание бизнеса

    logo_url: Mapped[str | None] = mapped_column(String(512))            # URL логотипа в MinIO/S3

    communication_style: Mapped[CommunicationStyleEnum] = mapped_column(
        Enum(CommunicationStyleEnum),
        nullable=False,
        default=CommunicationStyleEnum.FRIENDLY
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

def create_tables() -> None:
    with db_helper.engine.begin() as conn:
        Base.metadata.create_all(bind=conn)


create_tables()