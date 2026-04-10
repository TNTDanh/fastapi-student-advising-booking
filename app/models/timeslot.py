from sqlalchemy import Column, Date, ForeignKey, Integer, String, Time

from app.db.session import Base


class TimeSlot(Base):
    """Model TimeSlot cho khung gio tu van."""

    __tablename__ = "timeslots"

    # Khoa chinh
    id = Column(Integer, primary_key=True, index=True)
    # Co van phu trach khung gio
    advisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Ngay tu van
    slot_date = Column(Date, nullable=False)
    # Gio bat dau
    start_time = Column(Time, nullable=False)
    # Gio ket thuc
    end_time = Column(Time, nullable=False)
    # Trang thai hien tai (available, booked...) hien la chuoi don gian
    status = Column(String, nullable=False, default="available")
