"""Gom cac model de SQLAlchemy create_all nhan ra bang can tao."""

from app.db.session import Base
from app.models.user import User  # noqa: F401
from app.models.service import Service  # noqa: F401
from app.models.timeslot import TimeSlot  # noqa: F401
from app.models.appointment import Appointment  # noqa: F401
