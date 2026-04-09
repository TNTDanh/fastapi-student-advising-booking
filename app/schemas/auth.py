from pydantic import BaseModel


class RegisterRequest(BaseModel):
    """Payload dang ky nguoi dung."""

    full_name: str
    email: str
    password: str
    role: str = "student"


class LoginRequest(BaseModel):
    """Payload dang nhap."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """Token tra ve sau khi dang nhap thanh cong."""

    access_token: str
    token_type: str = "bearer"
