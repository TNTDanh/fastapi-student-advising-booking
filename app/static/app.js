const API_BASE = "";
let runtimeUser = null;

function getToken() {
    return localStorage.getItem("access_token");
}

function setToken(token) {
    localStorage.setItem("access_token", token);
}

function clearToken() {
    localStorage.removeItem("access_token");
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("current_user"));
    } catch {
        return null;
    }
}

function setStoredUser(user) {
    runtimeUser = user;
    localStorage.setItem("current_user", JSON.stringify(user));
}

function clearStoredUser() {
    runtimeUser = null;
    localStorage.removeItem("current_user");
}

function isAuthenticated() {
    return Boolean(getToken());
}

function getCurrentRole() {
    const user = runtimeUser || getStoredUser();
    return user?.role || null;
}

function getAuthHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getErrorMessage(data, fallback = "Có lỗi xảy ra") {
    if (typeof data?.detail === "string") {
        return data.detail;
    }
    return fallback;
}

function setMessage(targetId, text, isError = false) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.textContent = text;
    target.className = isError ? "message message-error" : "message message-success";
}

function setEmpty(targetId, text, actionHtml = "") {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.innerHTML = `
        <div class="empty-state">
            <p>${escapeHtml(text)}</p>
            ${actionHtml}
        </div>
    `;
}

function roleHome(role) {
    if (role === "student") {
        return "/booking-page";
    }
    if (role === "advisor") {
        return "/advisor-appointments-page";
    }
    if (role === "admin") {
        return "/dashboard";
    }
    return "/";
}

function redirectByRole() {
    window.location.href = roleHome(getCurrentRole());
}

async function fetchCurrentUser() {
    if (!getToken()) {
        return null;
    }
    const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        clearToken();
        clearStoredUser();
        updateNavbar();
        return null;
    }
    const user = await response.json();
    setStoredUser(user);
    updateNavbar();
    return user;
}

function updateNavbar() {
    const role = getCurrentRole();
    const loggedIn = isAuthenticated() && Boolean(role);
    const path = window.location.pathname;

    document.querySelectorAll(".nav-link").forEach((item) => {
        const roles = item.dataset.roles?.split(",").map((value) => value.trim()).filter(Boolean);
        const authOnly = item.dataset.auth === "true";
        const guestOnly = item.dataset.guest === "true";

        let visible = true;
        if (guestOnly) {
            visible = !loggedIn;
        } else if (authOnly) {
            visible = loggedIn;
        } else if (roles?.length) {
            visible = loggedIn && roles.includes(role);
        }

        item.classList.toggle("hidden", !visible);
        if (item.getAttribute("href") === path) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    const logoutButton = document.getElementById("nav-logout");
    if (logoutButton) {
        logoutButton.classList.toggle("hidden", !loggedIn);
    }
}

function renderGuard(targetId, message, actionHref = "/login", actionText = "Đăng nhập") {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.classList.remove("hidden");
    target.innerHTML = `
        <h2>${escapeHtml(message)}</h2>
        <p>Vui lòng chọn thao tác phù hợp để tiếp tục sử dụng hệ thống.</p>
        <a class="button" href="${actionHref}">${escapeHtml(actionText)}</a>
    `;
}

function hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.add("hidden");
    }
}

function showElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.remove("hidden");
    }
}

function requireAuth(options = {}) {
    if (isAuthenticated()) {
        return true;
    }
    if (options.contentId) {
        hideElement(options.contentId);
    }
    if (options.guardId) {
        renderGuard(
            options.guardId,
            options.message || "Bạn cần đăng nhập để truy cập trang này.",
            options.actionHref || "/login",
            options.actionText || "Đăng nhập"
        );
    }
    if (options.redirect) {
        setTimeout(() => {
            window.location.href = "/login";
        }, options.delay || 1200);
    }
    return false;
}

function requireRole(allowedRoles, options = {}) {
    if (!requireAuth(options)) {
        return false;
    }
    const role = getCurrentRole();
    if (allowedRoles.includes(role)) {
        return true;
    }
    if (options.contentId) {
        hideElement(options.contentId);
    }
    if (options.guardId) {
        renderGuard(
            options.guardId,
            "Bạn không có quyền truy cập trang này.",
            roleHome(role),
            "Về trang phù hợp"
        );
    }
    return false;
}

function updateTokenStatus() {
    const status = document.getElementById("token-status");
    if (!status) {
        return;
    }
    status.textContent = isAuthenticated() ? "Đã đăng nhập" : "Chưa đăng nhập";
}

function statusLabel(status) {
    const labels = {
        available: "Còn trống",
        booked: "Đã được đặt",
        pending: "Chờ xác nhận",
        confirmed: "Đã xác nhận",
        cancelled: "Đã hủy",
        completed: "Đã hoàn thành",
    };
    return labels[status] || status || "Không rõ";
}

function statusClass(status) {
    const classes = {
        available: "badge-success",
        booked: "badge-muted",
        pending: "badge-warning",
        confirmed: "badge-info",
        completed: "badge-success",
        cancelled: "badge-danger",
    };
    return classes[status] || "badge-muted";
}

async function login(event) {
    if (event) {
        event.preventDefault();
    }

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    if (!emailInput || !passwordInput) {
        return;
    }

    const formData = new URLSearchParams();
    formData.append("username", emailInput.value);
    formData.append("password", passwordInput.value);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage("login-message", getErrorMessage(data, "Đăng nhập thất bại"), true);
            return;
        }

        setToken(data.access_token);
        const user = await fetchCurrentUser();
        if (!user) {
            setMessage("login-message", "Không tải được thông tin tài khoản sau đăng nhập.", true);
            return;
        }

        setMessage("login-message", "Đăng nhập thành công. Đang chuyển trang...");
        setTimeout(redirectByRole, 600);
    } catch (error) {
        setMessage("login-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

function logout() {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
        return;
    }

    clearToken();
    clearStoredUser();
    updateNavbar();
    updateTokenStatus();
    alert("Đăng xuất thành công");
    window.location.href = "/";
}

async function loadProfile() {
    const target = document.getElementById("profile-result");
    if (!target) {
        return;
    }

    if (!requireAuth({ guardId: "dashboard-guard", contentId: "dashboard-content" })) {
        return;
    }

    try {
        const data = runtimeUser || getStoredUser() || await fetchCurrentUser();
        if (!data) {
            target.className = "profile-panel empty-state";
            target.textContent = "Bạn cần đăng nhập trước.";
            return;
        }

        target.className = "profile-panel";
        target.innerHTML = `
            <div class="profile-header">
                <div class="avatar">${escapeHtml(data.full_name?.charAt(0) || "U")}</div>
                <div>
                    <strong>${escapeHtml(data.full_name)}</strong>
                    <span>${escapeHtml(data.email)}</span>
                </div>
            </div>
            <div class="info-grid">
                <div><span>Mã người dùng</span><strong>#${escapeHtml(data.id)}</strong></div>
                <div><span>Vai trò</span><strong>${escapeHtml(data.role)}</strong></div>
                <div><span>Trạng thái</span><strong>${data.is_active ? "Đang hoạt động" : "Đã khóa"}</strong></div>
            </div>
        `;
    } catch (error) {
        target.className = "profile-panel empty-state";
        target.textContent = `Lỗi kết nối: ${error.message}`;
    }
}

function renderServices(data) {
    const target = document.getElementById("services-result");
    if (!target) {
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        setEmpty("services-result", "Không có loại tư vấn nào.");
        return;
    }

    target.innerHTML = data.map((service) => `
        <article class="item-card service-card">
            <div class="item-card-header">
                <div>
                    <span class="item-id">Mã dịch vụ #${escapeHtml(service.id)}</span>
                    <h2>${escapeHtml(service.name)}</h2>
                </div>
                <span class="badge ${service.is_active ? "badge-success" : "badge-muted"}">
                    ${service.is_active ? "Đang hoạt động" : "Tạm ngưng"}
                </span>
            </div>
            <p>${escapeHtml(service.description || "Chưa có mô tả.")}</p>
        </article>
    `).join("");
}

function renderTimeSlots(data) {
    const target = document.getElementById("timeslots-result");
    if (!target) {
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        setEmpty("timeslots-result", "Không có khung giờ nào.");
        return;
    }

    target.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã khung giờ</th>
                    <th>Cố vấn</th>
                    <th>Ngày</th>
                    <th>Giờ bắt đầu</th>
                    <th>Giờ kết thúc</th>
                    <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((slot) => `
                    <tr>
                        <td><strong>#${escapeHtml(slot.id)}</strong></td>
                        <td>Cố vấn #${escapeHtml(slot.advisor_id)}</td>
                        <td>${escapeHtml(slot.slot_date)}</td>
                        <td>${escapeHtml(slot.start_time)}</td>
                        <td>${escapeHtml(slot.end_time)}</td>
                        <td><span class="badge ${statusClass(slot.status)}">${escapeHtml(statusLabel(slot.status))}</span></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderMyAppointments(data) {
    const target = document.getElementById("my-appointments-result");
    if (!target) {
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        setEmpty(
            "my-appointments-result",
            "Bạn chưa có lịch hẹn nào.",
            `<a class="button" href="/booking-page">Đặt lịch tư vấn</a>`
        );
        return;
    }

    target.innerHTML = renderAppointmentTable(data, false);
}

function renderAppointmentTable(data, showActions) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã lịch</th>
                    <th>Sinh viên</th>
                    <th>Dịch vụ</th>
                    <th>Khung giờ</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    ${showActions ? "<th>Thao tác</th>" : ""}
                </tr>
            </thead>
            <tbody>
                ${data.map((appointment) => `
                    <tr>
                        <td><strong>#${escapeHtml(appointment.id)}</strong></td>
                        <td>#${escapeHtml(appointment.student_id)}</td>
                        <td>#${escapeHtml(appointment.service_id)}</td>
                        <td>#${escapeHtml(appointment.timeslot_id)}</td>
                        <td class="note-cell">${escapeHtml(appointment.note || "Không có")}</td>
                        <td><span class="badge ${statusClass(appointment.status)}">${escapeHtml(statusLabel(appointment.status))}</span></td>
                        ${showActions ? `
                            <td>
                                <div class="row-actions">
                                    <button class="mini-button" data-action="confirm" data-id="${appointment.id}">Xác nhận</button>
                                    <button class="mini-button mini-button-muted" data-action="cancel" data-id="${appointment.id}">Hủy</button>
                                    <button class="mini-button mini-button-success" data-action="complete" data-id="${appointment.id}">Hoàn thành</button>
                                </div>
                            </td>
                        ` : ""}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderSelectOptions(services, timeslots) {
    const serviceSelect = document.getElementById("booking-service");
    const timeslotSelect = document.getElementById("booking-timeslot");
    if (!serviceSelect || !timeslotSelect) {
        return;
    }

    const activeServices = Array.isArray(services) ? services.filter((service) => service.is_active) : [];
    const availableSlots = Array.isArray(timeslots)
        ? timeslots.filter((slot) => slot.status === "available")
        : [];

    serviceSelect.innerHTML = activeServices.length
        ? `<option value="">Chọn loại tư vấn</option>${activeServices.map((service) => `
            <option value="${escapeHtml(service.id)}">#${escapeHtml(service.id)} - ${escapeHtml(service.name)}</option>
        `).join("")}`
        : `<option value="">Không có loại tư vấn nào</option>`;

    timeslotSelect.innerHTML = availableSlots.length
        ? `<option value="">Chọn khung giờ</option>${availableSlots.map((slot) => `
            <option value="${escapeHtml(slot.id)}">
                Cố vấn #${escapeHtml(slot.advisor_id)} - ${escapeHtml(slot.slot_date)}
                - ${escapeHtml(slot.start_time)} đến ${escapeHtml(slot.end_time)}
            </option>
        `).join("")}`
        : `<option value="">Không có khung giờ trống</option>`;
}

async function loadServices() {
    if (!requireAuth({
        guardId: "services-guard",
        contentId: "services-content",
        message: "Bạn cần đăng nhập để xem nội dung này.",
        actionText: "Đi đến đăng nhập",
    })) {
        return;
    }

    showElement("services-content");

    try {
        const response = await fetch(`${API_BASE}/services/`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            setEmpty(
                "services-result",
                getErrorMessage(data, "Bạn cần đăng nhập để xem nội dung này"),
                `<a class="button" href="/login">Đi đến đăng nhập</a>`
            );
            return;
        }

        renderServices(data);
    } catch (error) {
        setEmpty("services-result", `Lỗi kết nối: ${error.message}`);
    }
}

async function loadTimeSlots() {
    if (!requireAuth({
        guardId: "timeslots-guard",
        contentId: "timeslots-content",
        message: "Bạn cần đăng nhập để xem nội dung này.",
        actionText: "Đi đến đăng nhập",
    })) {
        return;
    }

    showElement("timeslots-content");

    try {
        const response = await fetch(`${API_BASE}/timeslots/`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            setEmpty(
                "timeslots-result",
                "Bạn cần đăng nhập để xem nội dung này.",
                `<a class="button" href="/login">Đi đến đăng nhập</a>`
            );
            return;
        }

        renderTimeSlots(data);
    } catch (error) {
        setEmpty("timeslots-result", `Lỗi kết nối: ${error.message}`);
    }
}

async function loadMyAppointments() {
    if (!requireRole(["student"], { guardId: "my-appointments-guard", contentId: "my-appointments-content" })) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/my`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            setEmpty("my-appointments-result", getErrorMessage(data, "Không tải được lịch hẹn"));
            return;
        }

        renderMyAppointments(data);
    } catch (error) {
        setEmpty("my-appointments-result", `Lỗi kết nối: ${error.message}`);
    }
}

async function loadBookingData(showSuccessMessage = false) {
    if (!requireRole(["student"], { guardId: "booking-guard", contentId: "booking-content" })) {
        return;
    }

    const messageTarget = document.getElementById("booking-message");
    if (messageTarget && showSuccessMessage) {
        messageTarget.textContent = "";
        messageTarget.className = "message";
    }

    try {
        const [servicesResponse, timeslotsResponse] = await Promise.all([
            fetch(`${API_BASE}/services/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/timeslots/`, { headers: getAuthHeaders() }),
        ]);
        const services = await servicesResponse.json();
        const timeslots = await timeslotsResponse.json();

        if (!servicesResponse.ok) {
            setMessage("booking-message", getErrorMessage(services, "Bạn cần đăng nhập trước"), true);
            return;
        }
        if (!timeslotsResponse.ok) {
            setMessage("booking-message", getErrorMessage(timeslots, "Không tải được khung giờ tư vấn"), true);
            return;
        }

        renderSelectOptions(services, timeslots);
        if (showSuccessMessage) {
            setMessage("booking-message", "Đã tải dữ liệu đặt lịch.");
        }
    } catch (error) {
        setMessage("booking-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function createAppointment(event) {
    if (event) {
        event.preventDefault();
    }

    if (!requireRole(["student"], { guardId: "booking-guard", contentId: "booking-content" })) {
        return;
    }

    const serviceSelect = document.getElementById("booking-service");
    const timeslotSelect = document.getElementById("booking-timeslot");
    const noteInput = document.getElementById("booking-note");
    if (!serviceSelect || !timeslotSelect || !noteInput) {
        return;
    }

    if (!serviceSelect.value || !timeslotSelect.value) {
        setMessage("booking-message", "Vui lòng chọn loại tư vấn và khung giờ.", true);
        return;
    }

    const payload = {
        service_id: Number(serviceSelect.value),
        timeslot_id: Number(timeslotSelect.value),
        note: noteInput.value || null,
    };

    try {
        const response = await fetch(`${API_BASE}/appointments/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage("booking-message", getErrorMessage(data, "Đặt lịch thất bại"), true);
            return;
        }

        setMessage("booking-message", `Đặt lịch thành công. Mã lịch hẹn: #${data.id}`);
        event.target.reset();
        await loadBookingData(false);
        setTimeout(() => {
            window.location.href = "/my-appointments-page";
        }, 1000);
    } catch (error) {
        setMessage("booking-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function loadAdvisorAppointments() {
    if (!requireRole(["advisor", "admin"], { guardId: "advisor-appointments-guard", contentId: "advisor-appointments-content" })) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/`, {
            headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            setEmpty("advisor-appointments-result", getErrorMessage(data, "Không tải được danh sách lịch hẹn"));
            return;
        }

        const target = document.getElementById("advisor-appointments-result");
        if (!target) {
            return;
        }
        if (!Array.isArray(data) || data.length === 0) {
            setEmpty("advisor-appointments-result", "Chưa có lịch hẹn nào cần xử lý.");
            return;
        }
        target.innerHTML = renderAppointmentTable(data, true);
    } catch (error) {
        setEmpty("advisor-appointments-result", `Lỗi kết nối: ${error.message}`);
    }
}

async function updateAppointmentStatus(appointmentId, action) {
    const endpoints = {
        confirm: "confirm",
        cancel: "cancel",
        complete: "complete",
    };
    const endpoint = endpoints[action];
    if (!endpoint) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/${endpoint}`, {
            method: "PUT",
            headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage("advisor-appointments-message", getErrorMessage(data, "Thao tác thất bại"), true);
            return;
        }

        setMessage("advisor-appointments-message", "Cập nhật lịch hẹn thành công.");
        await loadAdvisorAppointments();
    } catch (error) {
        setMessage("advisor-appointments-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

function bindAdvisorActions() {
    const target = document.getElementById("advisor-appointments-result");
    if (!target) {
        return;
    }
    target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action][data-id]");
        if (!button) {
            return;
        }
        updateAppointmentStatus(button.dataset.id, button.dataset.action);
    });
}

async function initializePage() {
    runtimeUser = getStoredUser();
    if (getToken()) {
        // Luôn kiểm tra lại token khi vào trang để tránh dùng user cũ trong localStorage.
        await fetchCurrentUser();
    }
    updateNavbar();
    updateTokenStatus();

    const path = window.location.pathname;
    if (path === "/login" && isAuthenticated() && getCurrentRole()) {
        redirectByRole();
        return;
    }
    if (path === "/dashboard") {
        if (requireAuth({ guardId: "dashboard-guard", contentId: "dashboard-content", redirect: true })) {
            showElement("dashboard-content");
            await loadProfile();
        }
    }
    if (path === "/booking-page") {
        if (requireRole(["student"], { guardId: "booking-guard", contentId: "booking-content" })) {
            showElement("booking-content");
            await loadBookingData(false);
        }
    }
    if (path === "/my-appointments-page") {
        if (requireRole(["student"], { guardId: "my-appointments-guard", contentId: "my-appointments-content" })) {
            showElement("my-appointments-content");
            await loadMyAppointments();
        }
    }
    if (path === "/timeslots-page") {
        await loadTimeSlots();
    }
    if (path === "/services-page") {
        await loadServices();
    }
    if (path === "/advisor-appointments-page") {
        if (requireRole(["advisor", "admin"], { guardId: "advisor-appointments-guard", contentId: "advisor-appointments-content" })) {
            showElement("advisor-appointments-content");
            await loadAdvisorAppointments();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    document.getElementById("nav-logout")?.addEventListener("click", logout);
    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document.getElementById("load-profile-btn")?.addEventListener("click", loadProfile);
    document.getElementById("load-services-btn")?.addEventListener("click", loadServices);
    document.getElementById("load-timeslots-btn")?.addEventListener("click", loadTimeSlots);
    document.getElementById("load-my-appointments-btn")?.addEventListener("click", loadMyAppointments);
    document.getElementById("load-booking-data-btn")?.addEventListener("click", () => loadBookingData(true));
    document.getElementById("booking-form")?.addEventListener("submit", createAppointment);
    document.getElementById("load-advisor-appointments-btn")?.addEventListener("click", loadAdvisorAppointments);
    bindAdvisorActions();

    initializePage();
});
