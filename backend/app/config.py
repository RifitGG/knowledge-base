from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:1@localhost:4000/knowBase"
    secret_key: str = "change-me-in-production-please-1234567890"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    upload_dir: str = "uploads"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        if path.is_absolute():
            return path
        return Path(__file__).resolve().parents[1] / path


settings = Settings()
