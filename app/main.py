from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db.base import Base  # dang ky model
from app.db.session import engine
from app.routers import auth, services, timeslots, users, web

# Khoi tao ung dung FastAPI co ban
app = FastAPI(title="Student Advising Booking System")

# Tao bang tu dong cho giai doan hoc tap/phat trien (khong dung cho production)
Base.metadata.create_all(bind=engine)

# Phuc vu file tinh (CSS) de trang HTML hien thi dung
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health")
async def health_check():
    """Kiem tra nhanh tinh trang dich vu."""
    return {"status": "ok"}


# Gan router giao dien web va cac router API
app.include_router(web.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(timeslots.router)
