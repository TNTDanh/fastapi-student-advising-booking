from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.service import Service
from app.models.timeslot import TimeSlot
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.appointment import (
    AppointmentCancelRequest,
    AppointmentCreate,
    AppointmentDisplayRead,
    AppointmentRead,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def get_appointment_or_404(db: Session, appointment_id: int) -> Appointment:
    """Lay appointment theo id, khong co thi bao 404."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def get_timeslot_or_404(db: Session, timeslot_id: int) -> TimeSlot:
    """Lay timeslot theo id, khong co thi bao 404."""
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="TimeSlot not found")
    return timeslot


def ensure_advisor_or_admin_can_manage(current_user: User, timeslot: TimeSlot):
    """Kiem tra advisor/admin co quyen xu ly lich hen cua timeslot nay."""
    # Admin duoc quan ly tat ca appointment
    if current_user.role == "admin":
        return

    # Advisor chi duoc quan ly timeslot cua chinh minh
    if current_user.role == "advisor" and timeslot.advisor_id == current_user.id:
        return

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to manage this appointment",
    )


def user_display_name(user: User | None, fallback: str) -> str:
    """Lay ten hien thi cua user, neu thieu thi dung fallback."""
    if user:
        return user.full_name or user.email or fallback
    return fallback


def build_appointment_display(db: Session, appointments: list[Appointment]):
    """Gom du lieu hien thi appointment ma khong can relationship ORM."""
    if not appointments:
        return []

    student_ids = {appointment.student_id for appointment in appointments}
    service_ids = {appointment.service_id for appointment in appointments}
    timeslot_ids = {appointment.timeslot_id for appointment in appointments}

    students = db.query(User).filter(User.id.in_(student_ids)).all()
    services = db.query(Service).filter(Service.id.in_(service_ids)).all()
    timeslots = db.query(TimeSlot).filter(TimeSlot.id.in_(timeslot_ids)).all()

    student_map = {student.id: student for student in students}
    service_map = {service.id: service for service in services}
    timeslot_map = {timeslot.id: timeslot for timeslot in timeslots}

    advisor_ids = {timeslot.advisor_id for timeslot in timeslots}
    advisors = db.query(User).filter(User.id.in_(advisor_ids)).all() if advisor_ids else []
    advisor_map = {advisor.id: advisor for advisor in advisors}

    result = []
    for appointment in appointments:
        timeslot = timeslot_map[appointment.timeslot_id]
        advisor = advisor_map.get(timeslot.advisor_id)
        student = student_map.get(appointment.student_id)
        service = service_map.get(appointment.service_id)

        result.append(
            {
                "id": appointment.id,
                "student_id": appointment.student_id,
                "student_name": user_display_name(student, f"Sinh viên #{appointment.student_id}"),
                "service_id": appointment.service_id,
                "service_name": service.name if service else f"Dịch vụ #{appointment.service_id}",
                "timeslot_id": appointment.timeslot_id,
                "advisor_id": timeslot.advisor_id,
                "advisor_name": user_display_name(advisor, f"Cố vấn #{timeslot.advisor_id}"),
                "slot_date": timeslot.slot_date,
                "start_time": timeslot.start_time,
                "end_time": timeslot.end_time,
                "note": appointment.note,
                "status": appointment.status,
                "cancel_note": appointment.cancel_note,
                "cancelled_by": appointment.cancelled_by,
            }
        )
    return result


@router.post("/", response_model=AppointmentRead)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    """Student dat lich tu van."""
    # Service phai ton tai
    service = db.query(Service).filter(Service.id == payload.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # TimeSlot phai ton tai va con available
    timeslot = db.query(TimeSlot).filter(TimeSlot.id == payload.timeslot_id).first()
    if not timeslot:
        raise HTTPException(status_code=404, detail="TimeSlot not found")
    if timeslot.status != "available":
        raise HTTPException(status_code=400, detail="TimeSlot is not available")

    appointment = Appointment(
        student_id=current_user.id,
        service_id=payload.service_id,
        timeslot_id=payload.timeslot_id,
        note=payload.note,
        status="pending",
    )

    # Round 1: booked de khoa timeslot 
    timeslot.status = "booked"
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/", response_model=list[AppointmentDisplayRead])
def list_appointments_for_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Advisor/admin xem appointment de xu ly."""
    # Admin xem tat ca appointment
    if current_user.role == "admin":
        appointments = db.query(Appointment).order_by(Appointment.id.asc()).all()
        return build_appointment_display(db, appointments)

    # Advisor chi xem appointment gan voi timeslot cua minh
    slots = db.query(TimeSlot).filter(TimeSlot.advisor_id == current_user.id).all()
    timeslot_ids = [slot.id for slot in slots]
    if not timeslot_ids:
        return []

    appointments = (
        db.query(Appointment)
        .filter(Appointment.timeslot_id.in_(timeslot_ids))
        .order_by(Appointment.id.asc())
        .all()
    )
    return build_appointment_display(db, appointments)


@router.get("/my", response_model=list[AppointmentDisplayRead])
def list_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    """Student xem danh sach lich hen cua chinh minh."""
    # Chi lay appointment cua user dang dang nhap
    appointments = (
        db.query(Appointment)
        .filter(Appointment.student_id == current_user.id)
        .order_by(Appointment.id.asc())
        .all()
    )
    return build_appointment_display(db, appointments)


.

@router.put("/{appointment_id}/confirm", response_model=AppointmentRead)
def confirm_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Advisor/admin confirm appointment dang pending."""
    appointment = get_appointment_or_404(db, appointment_id)
    timeslot = get_timeslot_or_404(db, appointment.timeslot_id)
    ensure_advisor_or_admin_can_manage(current_user, timeslot)

    if appointment.status != "pending":
        raise HTTPException(status_code=400, detail="Chỉ những cuộc hẹn đang chờ xử lý mới có thể được xác nhận.")

    appointment.status = "confirmed"
    db.commit()
    db.refresh(appointment)
    return appointment


@router.put("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(
    appointment_id: int,
    payload: AppointmentCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel appointment va luu ly do huy theo quyen cua tung role."""
    appointment = get_appointment_or_404(db, appointment_id)
    timeslot = get_timeslot_or_404(db, appointment.timeslot_id)
    cancel_note = payload.cancel_note.strip()
    if not cancel_note:
        raise HTTPException(status_code=400, detail="Cancel note is required")

    if current_user.role == "student":
        # Student chi duoc huy lich cua chinh minh
        if appointment.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only cancel your own appointment")
    elif current_user.role in ["advisor", "admin"]:
        ensure_advisor_or_admin_can_manage(current_user, timeslot)
    else:
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this appointment")

    if appointment.status not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Only pending or confirmed appointments can be cancelled")

    appointment.status = "cancelled"
    appointment.cancel_note = cancel_note
    appointment.cancelled_by = current_user.role
    # Cancel se mo lai khung gio de nguoi khac co the dat
    timeslot.status = "available"
    db.commit()
    db.refresh(appointment)
    return appointment


@router.put("/{appointment_id}/complete", response_model=AppointmentRead)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["advisor", "admin"])),
):
    """Advisor/admin complete appointment da confirmed."""
    appointment = get_appointment_or_404(db, appointment_id)
    timeslot = get_timeslot_or_404(db, appointment.timeslot_id)
    ensure_advisor_or_admin_can_manage(current_user, timeslot)

    if appointment.status != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed appointments can be completed")

    appointment.status = "completed"
    # Complete giu timeslot la booked vi khung gio da duoc su dung
    db.commit()
    db.refresh(appointment)
    return appointment
