from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json


class Settings(BaseSettings):
    APP_NAME: str = "ZapTalk"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    SECRET_KEY: str = "insecure_default_change_me"

    DATABASE_URL: str = "sqlite+aiosqlite:///./zaptalk.db"

    EVOLUTION_API_URL: str = "http://localhost:8080"
    EVOLUTION_API_KEY: str = ""
    BACKEND_PUBLIC_URL: str = "http://backend:8000"
    FRONTEND_PUBLIC_URL: str = "http://localhost:5173"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "ZapTalk"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    AI_ENABLED: bool = False
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE_URL: str = "https://api.openai.com/v1"
    AI_MODEL_SUMMARY: str = "gpt-5.4-mini"
    AI_MODEL_SUGGEST_REPLY: str = "gpt-5.4-mini"
    AI_MODEL_CLASSIFY: str = "gpt-5.4-mini"
    AI_MODEL_TRANSFER_SUMMARY: str = "gpt-5.4"
    AI_MODEL_SENTIMENT: str = "gpt-5.4-mini"
    AI_MAX_CONTEXT_MESSAGES: int = 12
    AI_MAX_CONTEXT_NOTES: int = 8
    AI_MAX_CONTEXT_TRANSFERS: int = 8
    PUBLIC_SIGNUP_ENABLED: bool = True

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"
    AUTO_ASSIGN_CONVERSATIONS: bool = True
    MAX_ACTIVE_CONVERSATIONS_PER_AGENT: int = 5
    SLA_FIRST_RESPONSE_MINUTES: int = 15
    SLA_STALE_CONVERSATION_MINUTES: int = 30

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
