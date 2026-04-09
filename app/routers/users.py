from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.routers.auth import require_roles

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Tao nguoi dung moi (route test DB)."""
    # Kiem tra email da ton tai chua
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email da ton tai")

    # Luu y: password_hash hien chi la du lieu test, sau se thay bang hash that
    user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=user_in.password_hash,
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Lay danh sach tat ca nguoi dung (admin only, vi tra ve toan bo user)."""
    # Chua phan trang/filter vi day chi la route kiem tra
    return db.query(User).all()
