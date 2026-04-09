from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()

# Cau hinh thu muc template; phai truyen request rieng de Jinja2 render dung
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    """Trang chu tra ve HTML render tu template index.html."""
    return templates.TemplateResponse(
        name="index.html",
        request=request,  # Phai truyen request rieng, neu khong TemplateResponse se loi 500
        context={"title": "Student Advising Booking System"},
    )
