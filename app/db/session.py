from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# URL SQLite dung file app.db o root (cho hoc tap/phat trien)
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# connect_args can cho SQLite khi dung nhieu thread trong phat trien
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Factory tao session; moi request dung mot session rieng
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base cho ORM ke thua
Base = declarative_base()


def get_db():
    """Dependency cung cap session va dam bao dong ket noi."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
