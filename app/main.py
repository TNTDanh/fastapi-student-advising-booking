from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import web

app = FastAPI(
    title="Student Advising Booking System",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(web.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}