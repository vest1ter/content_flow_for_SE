from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel, PostgresDsn
import logging
from typing import Literal
import redis


class LoggingConfig(BaseModel):
    level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "DEBUG"
    format: str = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
    datefmt: str = "%Y-%m-%d %H:%M:%S"

class DatabaseConfig(BaseModel):
    url: PostgresDsn
    echo: bool = False
    echo_pool: bool = False
    pool_size: int = 50
    max_overflow: int = 10


class JWTConfig(BaseModel):
    secret_key: str
    algorithm: str
    access_token_exp_minutes: int
    refresh_token_expire_days: int

class RabbitConfig(BaseModel):
    host: str
    port: int

class RedisConfig(BaseModel):
    host: str
    port: int
    db: int




class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="APP_CONFIG__",
    )

    db: DatabaseConfig
    jwt: JWTConfig
    rabbit: RabbitConfig
    redis: RedisConfig
    logging: LoggingConfig = LoggingConfig()





settings = Settings()
redis_client = redis.Redis(host=settings.redis.host, port=settings.redis.port, db=settings.redis.db)

