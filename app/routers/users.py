from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserRead, UserStatusUpdate, UserTestCreate
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_or_404(db: Session, user_id: int) -> User:
    """Lay user theo id, khong co thi bao 404."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.post("/test-create", response_model=UserRead, include_in_schema=False)
def create_test_user(user_in: UserTestCreate, db: Session = Depends(get_db)):
    """Route test database only - do not use for real account registration."""
    # Kiem tra email da ton tai chua
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email đã tồn tại. Để tạo tài khoản đăng nhập thật, hãy dùng /auth/register",
        )

    # Route này chỉ để test DB nội bộ, password_hash phải là chuỗi đã hash sẵn.
    # Tài khoản đăng nhập thật phải tạo bằng /auth/register để password được hash đúng.
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
    """Lay danh sach tat ca nguoi dung cho admin."""
    # Admin chi quan ly trang thai khoa/mo, role duoc co dinh khi tao tai khoan.
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
        raise HTTPException(status_code=400, detail="Họ tên không được để trống")

    current_user.full_name = full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/{user_id}/status", response_model=UserRead)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin khoa/mo tai khoan user."""
    user = get_user_or_404(db, user_id)

    # Admin không được tự khóa chính mình để tránh mất quyền quản trị.
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của chính mình.")

    # Không cho khóa admin active cuối cùng, để hệ thống luôn còn ít nhất một admin.
    if user.role == "admin" and user.is_active and not payload.is_active:
        active_admin_count = (
            db.query(User)
            .filter(User.role == "admin", User.is_active.is_(True))
            .count()
        )
        if active_admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Không thể khóa tài khoản admin đang hoạt động cuối cùng.",
            )

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
