from sqlalchemy.orm import Session
from sqlalchemy import  select, desc, insert, update
from models.models import User
from datetime import datetime, timezone
import uuid




def get_user_by_email(email: str, session: Session):
    result = session.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()

    return user

def get_user_by_id(id: str, session: Session):
    result = session.execute(select(User).filter(User.id == id))
    user = result.scalar_one_or_none()

    return user

def get_user_by_username(username: str, session: Session):
    result = session.execute(select(User).filter(User.username == username))
    user = result.scalar_one_or_none()

    return user

def add_user_to_db(username: str, email: str, hashed_password: str, session: Session):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"📝 [Database] add_user_to_db called - username: '{username}', email: '{email}', username_type: {type(username)}")
    
    user_id = uuid.uuid4()
    logger.info(f"📝 [Database] Created user_id: {user_id}, now creating User object with username: '{username}'")
    
    user = User(
        id = user_id,
        username = username,
        email = email,
        confirmed = False,
        hashed_password = hashed_password
    )
    
    logger.info(f"📝 [Database] User object created - user.username: '{user.username}', user.email: '{user.email}'")
    logger.info(f"📝 [Database] User object id: {user.id}, username: '{user.username}', email: '{user.email}'")
    
    session.add(user)
    logger.info(f"📝 [Database] User added to session, username before commit: '{user.username}'")
    
    session.commit()
    logger.info(f"✅ [Database] Session committed successfully, user_id: {user_id}")
    
    return user_id


def confirm_user_by_id(user_id: uuid.UUID, session: Session) -> bool:
    result = session.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        return False

    user.confirmed = True
    session.commit()
    return True


def update_user_password(user_id: uuid.UUID, hashed_password: str, session: Session) -> bool:
    result = session.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        return False

    user.hashed_password = hashed_password
    session.commit()
    return True