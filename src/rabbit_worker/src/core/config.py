from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel, PostgresDsn
from typing import Literal




class RabbitConfig(BaseModel):
    host: str
    port: int

class SMTPConfig(BaseModel):
    # smtp — реальная отправка; console — код пишется в лог (демо-режим без почты)
    mode: Literal["smtp", "console"] = "smtp"
    server: str = ""
    port: int = 587
    user: str = ""
    password: str = ""

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="RABBITMQ_CONFIG__",
    )

    rabbit: RabbitConfig
    smtp: SMTPConfig

settings = Settings()