from sqlalchemy import Boolean, Column, Integer, String, Text

from app.db.session import Base


class Service(Base):
    """Model Service cho cac loai tu van."""

    __tablename__ = "services"

    # Khoa chinh
    id = Column(Integer, primary_key=True, index=True)
    # Ten dich vu, khong trung lap
    name = Column(String, unique=True, nullable=False)
    # Mo ta ngan ve dich vu
    description = Column(Text, nullable=True)
    # Trang thai hoat dong
    is_active = Column(Boolean, default=True)
