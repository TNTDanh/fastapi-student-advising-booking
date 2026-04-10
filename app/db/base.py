"""Dang ky Base va cac model de SQLAlchemy biet khi create_all."""

from app.db.session import Base
from app.models.user import User  # noqa: F401
from app.models.service import Service  # noqa: F401
from app.models.timeslot import TimeSlot  # noqa: F401
