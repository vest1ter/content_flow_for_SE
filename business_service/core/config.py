from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel, PostgresDsn
from typing import Literal




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

class MinioConfig(BaseModel):
    endpoint: str
    access_key: str
    secret_key: str
    secure: bool
    region: str
    public_url: str
    max_file_size: int



class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="APP_CONFIG__",
    )

    db: DatabaseConfig
    jwt: JWTConfig
    minio: MinioConfig


settings = Settings()


