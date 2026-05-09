from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.db.base import Base  # dang ky model
from app.db.session import engine
from app.routers import appointments, auth, services, timeslots, users, web

# Khoi tao ung dung FastAPI co ban
app = FastAPI(title="Student Advising Booking System")

# Tao bang tu dong cho giai doan hoc tap/phat trien (khong dung cho production)
Base.metadata.create_all(bind=engine)


def ensure_dev_schema_updates():
    """Cap nhat nhe SQLite dev vi create_all khong them cot vao bang da ton tai."""
    with engine.begin() as connection:
        appointment_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(appointments)"))
        }
        if "cancel_note" not in appointment_columns:
            connection.execute(text("ALTER TABLE appointments ADD COLUMN cancel_note TEXT"))
        if "cancelled_by" not in appointment_columns:
            connection.execute(text("ALTER TABLE appointments ADD COLUMN cancelled_by VARCHAR"))


ensure_dev_schema_updates()

# Phuc vu file tinh (CSS/JS) de trang HTML hien thi dung
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
app.include_router(appointments.router)
