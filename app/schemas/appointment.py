from datetime import date, time

from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    """Payload tao lich hen moi."""

    service_id: int
    timeslot_id: int
    note: str | None = None


class AppointmentCancelRequest(BaseModel):
    """Payload khi huy lich hen, bat buoc co ly do."""

    cancel_note: str


class AppointmentRead(BaseModel):
    """Schema output cho lich hen."""

    id: int
    student_id: int
    service_id: int
    timeslot_id: int
    note: str | None
    status: str
    cancel_note: str | None
    cancelled_by: str | None

    model_config = ConfigDict(from_attributes=True)


class AppointmentDisplayRead(BaseModel):
    """Schema hien thi lich hen co ten sinh vien, dich vu va co van."""

    id: int
    student_id: int
    student_name: str
    service_id: int
    service_name: str
    timeslot_id: int
    advisor_id: int
    advisor_name: str
    slot_date: date
    start_time: time
    end_time: time
    note: str | None
    status: str
    cancel_note: str | None
    cancelled_by: str | None
