from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel, PostgresDsn




class RabbitConfig(BaseModel):
    host: str
    port: int

class SMTPConfig(BaseModel):
    server: str
    port: int
    user: str
    password: str

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