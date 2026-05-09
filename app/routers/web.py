from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()

# Cấu hình thư mục template; phải truyền request riêng để Jinja2 render đúng
templates = Jinja2Templates(directory="app/templates")


def render_page(request: Request, template_name: str, title: str):
    """Render một trang HTML bằng TemplateResponse."""
    return templates.TemplateResponse(
        name=template_name,
        request=request,  # Truyền request riêng để url_for và template render đúng
        context={"title": title},
    )


@router.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    """Trang chủ của hệ thống."""
    return render_page(request, "index.html", "Hệ thống đặt lịch tư vấn học tập")


@router.get("/login", response_class=HTMLResponse)
async def read_login(request: Request):
    """Trang đăng nhập."""
    return render_page(request, "login.html", "Đăng nhập")


@router.get("/dashboard", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    """Trang thông tin cá nhân."""
    return render_page(request, "dashboard.html", "Thông tin cá nhân")


@router.get("/services-page", response_class=HTMLResponse)
async def read_services_page(request: Request):
    """Trang xem danh mục tư vấn."""
    return render_page(request, "services.html", "Danh mục tư vấn")


@router.get("/timeslots-page", response_class=HTMLResponse)
async def read_timeslots_page(request: Request):
    """Trang xem khung giờ tư vấn."""
    return render_page(request, "timeslots.html", "Khung giờ tư vấn")


@router.get("/my-appointments-page", response_class=HTMLResponse)
async def read_my_appointments_page(request: Request):
    """Trang xem lịch hẹn của sinh viên."""
    return render_page(request, "my_appointments.html", "Lịch hẹn của tôi")


@router.get("/booking-page", response_class=HTMLResponse)
async def read_booking_page(request: Request):
    """Trang đặt lịch tư vấn cho sinh viên."""
    return render_page(request, "booking.html", "Đặt lịch tư vấn")


@router.get("/advisor-appointments-page", response_class=HTMLResponse)
async def read_advisor_appointments_page(request: Request):
    """Trang quản lý lịch hẹn cho advisor/admin."""
    return render_page(request, "advisor_appointments.html", "Quản lý lịch hẹn")


@router.get("/admin-users-page", response_class=HTMLResponse)
async def read_admin_users_page(request: Request):
    """Trang quản lý tài khoản người dùng cho admin."""
    return render_page(request, "admin_users.html", "Quản lý người dùng")
