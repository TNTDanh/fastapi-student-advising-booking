# Student Advising Booking System

Hệ thống đặt lịch tư vấn học tập được xây dựng bằng FastAPI, Jinja2, SQLite và JavaScript thuần. Project mô phỏng quy trình sinh viên đặt lịch với cố vấn, cố vấn xử lý lịch hẹn và admin quản lý dữ liệu nền tảng.

## Mục tiêu

- Sinh viên đăng nhập, xem danh mục tư vấn, xem khung giờ và đặt lịch tư vấn.
- Sinh viên xem lịch hẹn của mình và hủy lịch kèm lý do.
- Cố vấn tạo/quản lý khung giờ của mình và xử lý lịch hẹn liên quan.
- Admin quản lý danh mục tư vấn, khung giờ, lịch hẹn và trạng thái tài khoản người dùng.
- Giao diện demo dùng Jinja2 + HTML/CSS + JavaScript thuần, không dùng framework frontend.

## Công nghệ sử dụng

- FastAPI
- Uvicorn
- Jinja2
- SQLAlchemy
- SQLite
- python-jose
- passlib[bcrypt]
- python-multipart

## Vai trò người dùng

| Role | Chức năng chính |
| --- | --- |
| student | Đặt lịch tư vấn, xem lịch hẹn của mình, hủy lịch có lý do |
| advisor | Quản lý khung giờ của mình, xem/confirm/cancel/complete lịch hẹn liên quan |
| admin | Quản lý danh mục tư vấn, user, khung giờ và toàn bộ lịch hẹn |

## Cách chạy project

Chạy trong Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Sau đó mở:

```text
http://127.0.0.1:8000
```

## Tạo tài khoản demo

Tạo tài khoản đăng nhập thật bằng API:

```text
POST /auth/register
```

Body ví dụ:

```json
{
  "full_name": "Nguyễn Văn A",
  "email": "student@example.com",
  "password": "123456",
  "role": "student"
}
```

Role có thể là:

```text
student
advisor
admin
```

Lưu ý: không dùng `/users/` để tạo tài khoản đăng nhập thật. Luồng đúng để đăng ký là `/auth/register` vì mật khẩu sẽ được hash trước khi lưu.

## Các trang giao diện chính

| Đường dẫn | Mục đích |
| --- | --- |
| `/` | Trang chủ |
| `/login` | Đăng nhập |
| `/dashboard` | Thông tin cá nhân, sửa họ tên, đăng xuất |
| `/services-page` | Xem danh mục tư vấn |
| `/timeslots-page` | Xem/quản lý khung giờ tùy role |
| `/booking-page` | Sinh viên đặt lịch tư vấn |
| `/my-appointments-page` | Sinh viên xem và hủy lịch hẹn của mình |
| `/advisor-appointments-page` | Advisor/admin quản lý lịch hẹn |
| `/admin-users-page` | Admin quản lý tài khoản người dùng |
| `/docs` | Swagger UI để test API |

## API chính

### Auth

- `POST /auth/register`: đăng ký tài khoản thật
- `POST /auth/login`: đăng nhập, trả JWT access token
- `GET /auth/me`: lấy thông tin người dùng hiện tại

### Users

- `GET /users/`: admin xem danh sách user
- `GET /users/advisors/active`: lấy danh sách advisor đang hoạt động
- `PUT /users/me/profile`: user tự sửa họ tên
- `PUT /users/{user_id}/status`: admin khóa/mở tài khoản

Rule an toàn khi khóa tài khoản:

- Admin không thể tự khóa tài khoản của chính mình.
- Không thể khóa admin đang hoạt động cuối cùng.
- Admin không đổi role user trong workflow hiện tại; role được cố định khi tạo tài khoản.

### Services

- `POST /services/`: admin tạo danh mục tư vấn
- `GET /services/`: user đã đăng nhập xem danh mục tư vấn
- `GET /services/{service_id}`: xem chi tiết danh mục tư vấn
- `PUT /services/{service_id}`: admin cập nhật danh mục tư vấn
- `DELETE /services/{service_id}`: admin xóa hoặc ngưng hoạt động danh mục tư vấn

### TimeSlots

- `POST /timeslots/`: advisor/admin tạo khung giờ
- `GET /timeslots/`: user đã đăng nhập xem khung giờ, có hiển thị tên cố vấn
- `PUT /timeslots/{timeslot_id}`: advisor/admin sửa khung giờ còn trống
- `DELETE /timeslots/{timeslot_id}`: advisor/admin xóa khung giờ còn trống

Rule:

- Advisor chỉ quản lý khung giờ của chính mình.
- Admin có thể quản lý mọi khung giờ.
- Khung giờ đã booked không được sửa/xóa.

### Appointments

- `POST /appointments/`: student đặt lịch
- `GET /appointments/my`: student xem lịch hẹn của mình
- `GET /appointments/`: advisor/admin xem lịch hẹn cần quản lý
- `PUT /appointments/{appointment_id}/confirm`: advisor/admin xác nhận lịch hẹn
- `PUT /appointments/{appointment_id}/cancel`: student/advisor/admin hủy lịch theo quyền, bắt buộc có lý do
- `PUT /appointments/{appointment_id}/complete`: advisor/admin hoàn thành lịch hẹn

Workflow trạng thái:

```text
pending -> confirmed -> completed
pending/confirmed -> cancelled
```

Khi student đặt lịch thành công, timeslot chuyển từ `available` sang `booked`. Khi hủy lịch, timeslot được mở lại thành `available`.

## Cấu trúc thư mục

```text
app/
├─ core/          # Cấu hình và bảo mật
├─ db/            # Kết nối database, SQLAlchemy Base
├─ models/        # SQLAlchemy models
├─ schemas/       # Pydantic schemas
├─ routers/       # API routers và web routes
├─ static/        # CSS, JavaScript
└─ templates/     # Jinja2 templates
```

## Database

Project dùng SQLite local với file:

```text
app.db
```

Trong giai đoạn đồ án/demo, bảng được tạo tự động bằng:

```python
Base.metadata.create_all(bind=engine)
```

Lưu ý: cách này phù hợp học tập và phát triển ban đầu. Dự án thực tế nên dùng Alembic để migration database.

## Ghi chú phát triển

- Mật khẩu được hash bằng passlib + bcrypt.
- JWT dùng để xác thực request qua header `Authorization: Bearer <token>`.
- Frontend lưu token trong `localStorage` để demo luồng đăng nhập.
- Các message lỗi ở frontend được xử lý an toàn để tránh hiện lỗi kỹ thuật thô khi backend trả lỗi không phải JSON.
- Route test tạo user nội bộ `/users/test-create` đã ẩn khỏi Swagger và không dùng cho đăng ký thật.
