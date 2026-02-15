import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class Config:
    _db_uri = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'foodmatch.db')}")
    if _db_uri.startswith("postgres://"):
        _db_uri = _db_uri.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
