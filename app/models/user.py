from sqlalchemy import Boolean, Column, Integer, String

from app.db.session import Base


class User(Base):
    """Model nguoi dung co cac truong chinh."""

    __tablename__ = "users"

    # Khoa chinh tu tang, dung index cho truy van nhanh
    id = Column(Integer, primary_key=True, index=True)
    # Ten day du cua nguoi dung
    full_name = Column(String, nullable=False)
    # Email duy nhat, co index de tim kiem
    email = Column(String, unique=True, index=True, nullable=False)
    # Mat khau da hash (khong luu plain text)
    password_hash = Column(String, nullable=False)
    # Vai tro nguoi dung, mac dinh student
    role = Column(String, nullable=False, default="student")
    # Trang thai hoat dong
    is_active = Column(Boolean, default=True)
