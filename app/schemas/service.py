from pydantic import BaseModel, ConfigDict


class ServiceCreate(BaseModel):
    """Payload tao service moi."""

    name: str
    description: str | None = None


class ServiceUpdate(BaseModel):
    """Payload cap nhat service."""

    name: str
    description: str | None = None
    is_active: bool


class ServiceRead(BaseModel):
    """Schema output service."""

    id: int
    name: str
    description: str | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
