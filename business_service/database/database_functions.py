# database/business_db.py
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from models.models import BusinessModel
import uuid


def create_business(
    session: Session,
    user_id: str,
    name: str,
    industry: str,
    audience_reach: str | None,
    region: str | None,
    description: str | None,
    logo_url: str | None,
    communication_style: str,
) -> BusinessModel:
    business = BusinessModel(
        id=uuid.uuid4(),
        user_id=user_id,
        name=name,
        industry=industry,
        audience_reach=audience_reach,
        region=region,
        description=description,
        logo_url=logo_url,
        communication_style=communication_style,
    )
    session.add(business)
    session.commit()
    session.refresh(business)
    return business


def get_business_by_id(session: Session, business_id: str) -> BusinessModel | None:
    return session.get(BusinessModel, business_id)


def get_businesses_by_user_id(session: Session, user_id: str) -> list[BusinessModel]:
    stmt = select(BusinessModel).where(BusinessModel.user_id == user_id)
    return list(session.execute(stmt).scalars())


def update_business(
    session: Session,
    business_id: str,
    name: str | None = None,
    industry: str | None = None,
    audience_reach: str | None = None,
    region: str | None = None,
    description: str | None = None,
    logo_url: str | None = None,
    communication_style: str | None = None,
) -> BusinessModel | None:
    business = session.get(BusinessModel, business_id)
    if not business:
        return None

    if name is not None:
        business.name = name
    if industry is not None:
        business.industry = industry
    if audience_reach is not None:
        business.audience_reach = audience_reach
    if region is not None:
        business.region = region
    if description is not None:
        business.description = description
    if logo_url is not None:
        business.logo_url = logo_url
    if communication_style is not None:
        business.communication_style = communication_style

    session.commit()
    session.refresh(business)
    return business


def delete_business(session: Session, business_id: str) -> bool:
    business = session.get(BusinessModel, business_id)
    if not business:
        return False
    session.delete(business)
    session.commit()
    return True


def set_active_business(session: Session, user_id: str, business_id: str) -> BusinessModel | None:
    """Устанавливает бизнес как активный и деактивирует все остальные бизнесы пользователя"""
    # Проверяем, что бизнес существует и принадлежит пользователю
    business = session.get(BusinessModel, business_id)
    if not business or business.user_id != user_id:
        return None
    
    # Деактивируем все бизнесы пользователя
    stmt = (
        update(BusinessModel)
        .where(BusinessModel.user_id == user_id)
        .values(is_active=False)
    )
    session.execute(stmt)
    
    # Активируем выбранный бизнес
    business.is_active = True
    session.commit()
    session.refresh(business)
    return business


def get_active_business_by_user_id(session: Session, user_id: str) -> BusinessModel | None:
    """Получает активный бизнес пользователя"""
    stmt = select(BusinessModel).where(
        BusinessModel.user_id == user_id,
        BusinessModel.is_active == True
    )
    result = session.execute(stmt).scalar_one_or_none()
    return result