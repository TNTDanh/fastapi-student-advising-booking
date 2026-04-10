from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.service import Service
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceRead
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/services", tags=["Services"])


@router.post("/", response_model=ServiceRead)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    """Tao service moi (chi admin)."""
    # Kiem tra trung ten
    if db.query(Service).filter(Service.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Service name already exists")

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
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
