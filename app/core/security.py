from datetime import datetime, timedelta
from typing import Any, Dict

from jose import JWTError, jwt
from passlib.context import CryptContext

# Luu y: SECRET_KEY chi la vi du hoc tap, production phai lay tu bien moi truong
SECRET_KEY = "change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Context bam mat khau dung bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Bam mat khau plain sang hash."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiem tra mat khau plain co khop hash khong."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any]) -> str:
    """Tao JWT tu payload data va them thoi gian het han."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Giai ma JWT, neu token loi se nem JWTError de handle ben ngoai."""
    # jwt.decode se kiem tra chu ky va thoi gian het han
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
