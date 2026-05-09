from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    """Payload tao lich hen moi."""

    service_id: int
    timeslot_id: int
    note: str | None = None


class AppointmentRead(BaseModel):
    """Schema output cho lich hen."""

    id: int
    student_id: int
    service_id: int
    timeslot_id: int
    note: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)
