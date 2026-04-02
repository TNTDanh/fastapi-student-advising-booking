from sqlalchemy import Column, Integer, String, ForeignKey, Text
from app.db.session import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"), nullable=False)
    note = Column(Text, nullable=True)
    status = Column(String, default="pending")