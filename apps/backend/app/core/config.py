from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, PostgresDsn, RedisDsn
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Aapda Setu API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: PostgresDsn = Field(
        default="postgresql+asyncpg://aapda:aapda_dev_password@localhost:5432/aapda_setu",
        validation_alias="DATABASE_URL",
    )

    # Redis
    REDIS_URL: RedisDsn = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL",
    )

    # Celery
    CELERY_BROKER_URL: RedisDsn = Field(
        default="redis://localhost:6379/1",
        validation_alias="CELERY_BROKER_URL",
    )
    CELERY_RESULT_BACKEND: RedisDsn = Field(
        default="redis://localhost:6379/2",
        validation_alias="CELERY_RESULT_BACKEND",
    )

    # Security
    SECRET_KEY: str = Field(
        default="dev-secret-key-change-in-production-min-32-chars",
        validation_alias="SECRET_KEY",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # GIS
    DEFAULT_CRS: str = "EPSG:4326"
    MAP_CRS: str = "EPSG:3857"

    # Optimization
    ORTOOLS_TIME_LIMIT_SECONDS: int = 30
    ORTOOLS_NUM_WORKERS: int = 4

    # External APIs (optional)
    OPENWEATHER_API_KEY: Optional[str] = None
    IMD_API_KEY: Optional[str] = None


settings = Settings()