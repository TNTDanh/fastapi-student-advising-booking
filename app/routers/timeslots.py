from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.timeslot import TimeSlot
from app.models.user import User
from app.schemas.timeslot import TimeSlotCreate, TimeSlotRead
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/timeslots", tags=["TimeSlots"])


@router.post("/", response_model=TimeSlotRead)
def create_timeslot(
    payload: TimeSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Tao khung gio tu van (advisor chi tao cho chinh minh, admin tao cho bat ky ai)."""
    # Advisor khong duoc tao slot cho advisor khac
    if current_user.role == "advisor" and payload.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Advisor cannot create timeslot for another advisor")

    # start_time phai < end_time
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")

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


@router.get("/", response_model=list[TimeSlotRead])
def list_timeslots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sach khung gio (bat ky user da dang nhap)."""
    return db.query(TimeSlot).all()
