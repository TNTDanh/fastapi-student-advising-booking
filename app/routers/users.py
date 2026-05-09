from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserProfileUpdate, UserRead, UserRoleUpdate, UserStatusUpdate
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])
ALLOWED_ROLES = {"student", "advisor", "admin"}


def get_user_or_404(db: Session, user_id: int) -> User:
    """Lay user theo id, khong co thi bao 404."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


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


@router.get("/advisors/active", response_model=list[UserRead])
def list_active_advisors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Lay danh sach advisor dang hoat dong de admin chon khi tao timeslot."""
    return (
        db.query(User)
        .filter(User.role == "advisor", User.is_active.is_(True))
        .order_by(User.full_name.asc())
        .all()
    )


@router.put("/me/profile", response_model=UserRead)
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User dang dang nhap tu cap nhat ho ten cua chinh minh."""
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")

    current_user.full_name = full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin doi role user theo danh sach role hop le."""
    if payload.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = get_user_or_404(db, user_id)
    if user.id == current_user.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Admin cannot remove own admin role")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/status", response_model=UserRead)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin khoa/mo tai khoan user."""
    user = get_user_or_404(db, user_id)
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
