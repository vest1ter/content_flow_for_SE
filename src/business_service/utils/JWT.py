import jwt

from datetime import datetime, timedelta, timezone
from core.config import settings
from pydantic import BaseModel
from grpc import StatusCode
from uuid import UUID

class UserInfo(BaseModel):
    id: UUID
    username: str
    token_type: str


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
            context.abort(StatusCode.UNAUTHENTICATED, "Token not access")
        return UserInfo(id=user_id, username=username, token_type=token_type)
    except jwt.ExpiredSignatureError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token has expired")
    except jwt.InvalidTokenError:
        context.abort(StatusCode.UNAUTHENTICATED, "Token is invalid")

