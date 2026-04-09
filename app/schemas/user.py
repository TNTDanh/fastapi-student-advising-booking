from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    """Schema input khi tao nguoi dung moi."""

    full_name: str
    email: str
    password_hash: str  # Hien chi la du lieu test, sau se la mat khau hash that
    role: str = "student"


class UserRead(BaseModel):
    """Schema output tra ve cho client."""

    id: int
    full_name: str
    email: str
    role: str
    is_active: bool

    # Cho phep doc du lieu tu ORM model
    model_config = ConfigDict(from_attributes=True)
