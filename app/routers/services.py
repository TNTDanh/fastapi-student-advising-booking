from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.service import Service
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/services", tags=["Services"])


def get_service_or_404(db: Session, service_id: int) -> Service:
    """Lay service theo id, khong co thi bao 404."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/", response_model=ServiceRead)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Tao service moi (chi admin)."""
    # Kiem tra trung ten
    if db.query(Service).filter(Service.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Tên dịch vụ đã tồn tại.")

    service = Service(
        name=payload.name,
        description=payload.description,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/", response_model=list[ServiceRead])
def list_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xem danh sach service (bat ky user da dang nhap)."""
    return db.query(Service).all()


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xem chi tiet mot service (bat ky user da dang nhap)."""
    return get_service_or_404(db, service_id)


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin cap nhat danh muc tu van."""
    service = get_service_or_404(db, service_id)
    duplicate = (
        db.query(Service)
        .filter(Service.name == payload.name, Service.id != service_id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Tên dịch vụ đã tồn tại.")

    service.name = payload.name
    service.description = payload.description
    service.is_active = payload.is_active
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Admin xoa service; neu da duoc dung thi chi ngung hoat dong."""
    service = get_service_or_404(db, service_id)
    used = db.query(Appointment).filter(Appointment.service_id == service_id).first()
    if used:
        service.is_active = False
        db.commit()
        return {"message": "Dịch vụ đang được sử dụng không thể xóa."}

    db.delete(service)
    db.commit()
    return {"message": "Đã xóa dịch vụ thành công."}
