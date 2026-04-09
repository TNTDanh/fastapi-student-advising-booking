from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])

# oauth2 scheme de Swagger UI co nut Authorize, nhan token Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def require_roles(allowed_roles: list[str]):
    """Dependency simple RBAC theo role name."""

    def inner(current_user: User = Depends(get_current_user)):
        # Neu role khong nam trong danh sach duoc phep -> 403
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return inner


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Lay user hien tai tu JWT, neu that bai tra 401."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        # Token khong hop le / het han
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Dang ky nguoi dung moi."""
    # Kiem tra email ton tai
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email da ton tai")

    # Hash password truoc khi luu DB
    hashed_pw = hash_password(payload.password)
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hashed_pw,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Khong tra password_hash ra ngoai
    return {
        "message": "Register successful",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        },
    }


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Dang nhap va tra ve JWT (nhan form username/password de Swagger Authorize hoat dong)."""
    # Swagger se gui username/password theo OAuth2PasswordRequestForm; dung username lam email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email khong ton tai")

    # Kiem tra mat khau
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Mat khau khong dung")

    # Tao JWT cho user
    token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
        }
    )
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    """Tra ve thong tin user hien tai (protected route)."""
    # current_user da duoc xac thuc qua JWT
    return current_user


@router.get("/student-area")
def student_area(current_user: User = Depends(require_roles(["student", "advisor", "admin"]))):
    """Khu vuc cho student/advisor/admin."""
    # Demo RBAC don gian
    return {
        "message": "Welcome to the student area",
        "user_email": current_user.email,
        "role": current_user.role,
    }


@router.get("/advisor-area")
def advisor_area(current_user: User = Depends(require_roles(["advisor", "admin"]))):
    """Khu vuc cho advisor/admin."""
    return {
        "message": "Welcome to the advisor area",
        "user_email": current_user.email,
        "role": current_user.role,
    }


@router.get("/admin-area")
def admin_area(current_user: User = Depends(require_roles(["admin"]))):
    """Khu vuc chi danh cho admin."""
    return {
        "message": "Welcome to the admin area",
        "user_email": current_user.email,
        "role": current_user.role,
    }
