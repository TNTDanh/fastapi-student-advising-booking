from fastapi import APIRouter, Depends, HTTPException
from datetime import date, time

from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.timeslot import TimeSlot
from app.models.user import User
from app.schemas.timeslot import TimeSlotCreate, TimeSlotDisplayRead, TimeSlotRead, TimeSlotUpdate
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/timeslots", tags=["TimeSlots"])

OVERLAP_ERROR_DETAIL = "Khung giờ này bị trùng với một khung giờ tư vấn đã tồn tại của cố vấn."


def get_timeslot_or_404(db: Session, timeslot_id: int) -> TimeSlot:
    """Lay timeslot theo id, khong co thi bao 404."""
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="Không tìm thấy khung giờ.")
    return timeslot


def ensure_can_manage_timeslot(current_user: User, timeslot: TimeSlot):
    """Kiem tra advisor/admin co quyen quan ly khung gio."""
    if current_user.role == "admin":
        return
    if current_user.role == "advisor" and timeslot.advisor_id == current_user.id:
        return
    raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý khung giờ này.")


def check_timeslot_overlap(
    db: Session,
    advisor_id: int,
    slot_date: date,
    start_time: time,
    end_time: time,
    exclude_timeslot_id: int | None = None,
) -> None:
    """Kiem tra khung gio co chong lan voi slot cu cua cung advisor trong ngay khong."""
    # Hai khoang thoi gian overlap khi: new_start < old_end AND new_end > old_start.
    # Duoc cham bien nhau, vi du 08:00-09:00 va 09:00-10:00, thi khong bi tinh la trung.
    query = db.query(TimeSlot).filter(
        TimeSlot.advisor_id == advisor_id,
        TimeSlot.slot_date == slot_date,
        TimeSlot.start_time < end_time,
        TimeSlot.end_time > start_time,
    )
    if exclude_timeslot_id is not None:
        query = query.filter(TimeSlot.id != exclude_timeslot_id)

    if query.first():
        raise HTTPException(status_code=400, detail=OVERLAP_ERROR_DETAIL)


def user_display_name(user: User | None, fallback_id: int) -> str:
    """Lay ten hien thi cua co van, neu thieu thi fallback theo id."""
    if user:
        return user.full_name or user.email or f"Cố vấn #{fallback_id}"
    return f"Cố vấn #{fallback_id}"


@router.post("/", response_model=TimeSlotRead)
def create_timeslot(
    payload: TimeSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Tao khung gio tu van (advisor chi tao cho chinh minh, admin tao cho bat ky ai)."""
    # Advisor khong duoc tao slot cho advisor khac
    if current_user.role == "advisor" and payload.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cố vấn không thể tạo khung giờ cho cố vấn khác.")

    # start_time phai < end_time
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="Thời gian bắt đầu phải trước thời gian kết thúc.")

    check_timeslot_overlap(
        db=db,
        advisor_id=payload.advisor_id,
        slot_date=payload.slot_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )

    timeslot = TimeSlot(
        advisor_id=payload.advisor_id,
        slot_date=payload.slot_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="available",
    )
    db.add(timeslot)
    db.commit()
    db.refresh(timeslot)
    return timeslot


@router.get("/", response_model=list[TimeSlotDisplayRead])
def list_timeslots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sach khung gio kem ten co van (bat ky user da dang nhap)."""
    timeslots = db.query(TimeSlot).order_by(TimeSlot.id.asc()).all()
    advisor_ids = {slot.advisor_id for slot in timeslots}
    advisors = db.query(User).filter(User.id.in_(advisor_ids)).all() if advisor_ids else []
    advisor_map = {advisor.id: advisor for advisor in advisors}

    return [
        {
            "id": slot.id,
            "advisor_id": slot.advisor_id,
            "advisor_name": user_display_name(advisor_map.get(slot.advisor_id), slot.advisor_id),
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "status": slot.status,
        }
        for slot in timeslots
    ]


@router.put("/{timeslot_id}", response_model=TimeSlotRead)
def update_timeslot(
    timeslot_id: int,
    payload: TimeSlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Advisor/admin sua khung gio khi slot con available."""
    timeslot = get_timeslot_or_404(db, timeslot_id)
    ensure_can_manage_timeslot(current_user, timeslot)

    if timeslot.status != "available":
        raise HTTPException(status_code=400, detail="Chỉ có thể cập nhật các khung giờ còn trống.")
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="Thời gian bắt đầu phải trước thời gian kết thúc.")

    check_timeslot_overlap(
        db=db,
        advisor_id=timeslot.advisor_id,
        slot_date=payload.slot_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        exclude_timeslot_id=timeslot.id,
    )

    timeslot.slot_date = payload.slot_date
    timeslot.start_time = payload.start_time
    timeslot.end_time = payload.end_time
    db.commit()
    db.refresh(timeslot)
    return timeslot


@router.delete("/{timeslot_id}")
def delete_timeslot(
    timeslot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Advisor/admin xoa khung gio khi slot con available."""
    timeslot = get_timeslot_or_404(db, timeslot_id)
    ensure_can_manage_timeslot(current_user, timeslot)

    if timeslot.status != "available":
        raise HTTPException(status_code=400, detail="Chỉ những khung giờ còn trống mới có thể bị xóa.")

    db.delete(timeslot)
    db.commit()
    return {"message": "Khung giờ của cố vấn này đã được xóa."}
