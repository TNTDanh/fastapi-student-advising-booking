from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import web
from app.db.session import Base, engine
from app.db import base  # noqa
from app.routers import web, auth


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Student Advising Booking System", version="1.0.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(web.router)
app.include_router(auth.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}