from datetime import date, time

from pydantic import BaseModel, ConfigDict


class TimeSlotCreate(BaseModel):
    """Payload tao khung gio tu van."""

    advisor_id: int
    slot_date: date
    start_time: time
    end_time: time


class TimeSlotUpdate(BaseModel):
    """Payload cap nhat khung gio tu van."""

    slot_date: date
    start_time: time
    end_time: time


class TimeSlotRead(BaseModel):
    """Schema output khung gio tu van."""

    id: int
    advisor_id: int
    slot_date: date
    start_time: time
    end_time: time
    status: str

    model_config = ConfigDict(from_attributes=True)


class TimeSlotDisplayRead(BaseModel):
    """Schema hien thi khung gio co ten co van."""

    id: int
    advisor_id: int
    advisor_name: str
    slot_date: date
    start_time: time
    end_time: time
    status: str
