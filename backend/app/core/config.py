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
