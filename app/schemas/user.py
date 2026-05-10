from pydantic import BaseModel, ConfigDict


class UserTestCreate(BaseModel):
    """Schema test DB nội bộ, không dùng để đăng ký tài khoản thật."""

    full_name: str
    email: str
    # password_hash chỉ dùng cho route test, không nhập mật khẩu thô ở đây
    password_hash: str
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


class UserStatusUpdate(BaseModel):
    """Payload admin dung de khoa/mo tai khoan."""

    is_active: bool


class UserProfileUpdate(BaseModel):
    """Payload user dung de cap nhat ten cua chinh minh."""

    full_name: str
