from sqlalchemy import Column, ForeignKey, Integer, String, Text

from app.db.session import Base


class Appointment(Base):
    """Model Appointment noi student, service va timeslot."""

    __tablename__ = "appointments"

    # Khoa chinh cua lich hen
    id = Column(Integer, primary_key=True, index=True)
    # Sinh vien dat lich
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Loai tu van duoc chon
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    # Khung gio duoc dat
    timeslot_id = Column(Integer, ForeignKey("timeslots.id"), nullable=False)
    # Ghi chu them cua sinh vien
    note = Column(Text, nullable=True)
    # Trang thai ban dau cua lich hen
    status = Column(String, nullable=False, default="pending")
    # Luu ly do huy lich hen
    cancel_note = Column(Text, nullable=True)
    # Luu role da huy lich: student/advisor/admin
    cancelled_by = Column(String, nullable=True)
