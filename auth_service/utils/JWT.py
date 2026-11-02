import jwt

from datetime import datetime, timedelta, timezone
from core.config import settings
from pydantic import BaseModel
from grpc import StatusCode
from schemas.auth_schemas import UserInfo

def create_access_token(user_id: str, username: str, context) -> str:
    payload = {
        'id': str(user_id),
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=settings.jwt.access_token_exp_minutes),
        'iat': datetime.now(timezone.utc),
        'token_type': 'access',
    }

    try:
        return jwt.encode(payload, settings.jwt.secret_key, settings.jwt.algorithm)
    except Exception as e:
        context.abort(StatusCode.INVALID_ARGUMENT, str(e))
        print(e)

def create_refresh_token(user_id: str, username: str, context) -> str:
    payload = {
        'id': str(user_id),
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(days=settings.jwt.refresh_token_expire_days),
        'iat': datetime.now(timezone.utc),
        'token_type': 'refresh',
    }

    try:
        return jwt.encode(payload, settings.jwt.secret_key, settings.jwt.algorithm)
    except Exception as e:
        context.abort(StatusCode.INVALID_ARGUMENT, str(e))
        print(e)

def create_email_token(user_id: str, username: str, context) -> str:
    payload = {
        'id': str(user_id),
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=15),
        'iat': datetime.now(timezone.utc),
        'token_type': 'email',
    }

    try:
        return jwt.encode(payload, settings.jwt.secret_key, settings.jwt.algorithm)
    except Exception as e:
        context.abort(StatusCode.INVALID_ARGUMENT, str(e))
        print(e)


def verify_token(token: str, context):
    if token.startswith("Bearer "):
        token = token.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.jwt.secret_key, algorithms=[settings.jwt.algorithm])
        user_id = payload.get("id")
        username = payload.get("username")
        token_type = payload.get("token_type")
        if not user_id or not username:
            context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")
        if token_type == "email":
            context.abort(StatusCode.UNAUTHENTICATED, "Token not access/refresh")
        return UserInfo(id=user_id, username=username, token_type=token_type)
    except jwt.ExpiredSignatureError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token has expired")
    except jwt.InvalidTokenError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")


def verify_token_email(token: str, context):
    if token.startswith("Bearer "):
        token = token.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.jwt.secret_key, algorithms=[settings.jwt.algorithm])
        user_id = payload.get("id")
        username = payload.get("username")
        token_type = payload.get("token_type")
        if not user_id or not username:
            context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")
        return UserInfo(id=user_id, username=username, token_type=token_type)
    except jwt.ExpiredSignatureError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token has expired")
    except jwt.InvalidTokenError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")


def create_reset_password_token(user_id: str, username: str, context) -> str:
    payload = {
        'id': str(user_id),
        'username': username,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30),
        'iat': datetime.now(timezone.utc),
        'token_type': 'reset_password',
    }

    try:
        return jwt.encode(payload, settings.jwt.secret_key, settings.jwt.algorithm)
    except Exception as e:
        context.abort(StatusCode.INVALID_ARGUMENT, str(e))
        print(e)


def verify_token_reset_password(token: str, context):
    if token.startswith("Bearer "):
        token = token.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.jwt.secret_key, algorithms=[settings.jwt.algorithm])
        user_id = payload.get("id")
        username = payload.get("username")
        token_type = payload.get("token_type")
        if not user_id or not username:
            context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")
        if token_type != "reset_password":
            context.abort(StatusCode.UNAUTHENTICATED, "Token not reset_password")
        return UserInfo(id=user_id, username=username, token_type=token_type)
    except jwt.ExpiredSignatureError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token has expired")
    except jwt.InvalidTokenError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")