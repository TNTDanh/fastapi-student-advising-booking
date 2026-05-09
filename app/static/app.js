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

function getCurrentUser() {
    return runtimeUser || getStoredUser();
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

function setLoading(targetId, message = "Đang tải dữ liệu...") {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.innerHTML = `<div class="loading-box">${escapeHtml(message)}</div>`;
}

function finishPageLoading(loadingId) {
    if (loadingId) {
        hideElement(loadingId);
    }
}

function clearMessage(targetId) {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.textContent = "";
    target.className = "message";
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        return;
    }
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
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

function setBookingFormLoading(isLoading) {
    const serviceSelect = document.getElementById("booking-service");
    const timeslotSelect = document.getElementById("booking-timeslot");
    if (!serviceSelect || !timeslotSelect) {
        return;
    }

    serviceSelect.disabled = isLoading;
    timeslotSelect.disabled = isLoading;
    if (isLoading) {
        serviceSelect.innerHTML = `<option value="">Đang tải danh mục tư vấn...</option>`;
        timeslotSelect.innerHTML = `<option value="">Đang tải khung giờ...</option>`;
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

function isAdmin() {
    return getCurrentRole() === "admin";
}

function isStaff() {
    return ["advisor", "admin"].includes(getCurrentRole());
}

function canManageTimeSlot(slot) {
    const user = getCurrentUser();
    if (!user) {
        return false;
    }
    return user.role === "admin" || (user.role === "advisor" && Number(slot.advisor_id) === Number(user.id));
}

function advisorLabel(slot) {
    return slot.advisor_name || `Cố vấn #${slot.advisor_id}`;
}

function timeRangeLabel(item) {
    return `${item.slot_date} - ${item.start_time} đến ${item.end_time}`;
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

    target.className = "profile-panel";
    target.innerHTML = `<div class="loading-box">Đang tải thông tin cá nhân...</div>`;

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
        const nameInput = document.getElementById("profile-full-name");
        if (nameInput) {
            nameInput.value = data.full_name || "";
        }
    } catch (error) {
        target.className = "profile-panel empty-state";
        target.textContent = `Lỗi kết nối: ${error.message}`;
    }
}

async function submitProfileForm(event) {
    event.preventDefault();
    const nameInput = document.getElementById("profile-full-name");
    if (!nameInput) {
        return;
    }
    const fullName = nameInput.value.trim();
    if (!fullName) {
        setMessage("profile-message", "Họ tên không được để trống.", true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/me/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ full_name: fullName }),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("profile-message", getErrorMessage(data, "Cập nhật họ tên thất bại"), true);
            return;
        }

        setStoredUser(data);
        updateNavbar();
        setMessage("profile-message", "Cập nhật họ tên thành công.");
        await loadProfile();
    } catch (error) {
        setMessage("profile-message", `Lỗi kết nối: ${error.message}`, true);
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
            ${isAdmin() ? `
                <div class="row-actions">
                    <button class="mini-button" data-service-action="edit" data-service='${escapeHtml(JSON.stringify(service))}'>Sửa</button>
                    <button class="mini-button mini-button-muted" data-service-action="delete" data-id="${escapeHtml(service.id)}">
                        ${service.is_active ? "Ngưng hoạt động / Xóa" : "Xóa"}
                    </button>
                </div>
            ` : ""}
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

    const showActions = isStaff();
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
                    ${showActions ? "<th>Thao tác</th>" : ""}
                </tr>
            </thead>
            <tbody>
                ${data.map((slot) => `
                    <tr>
                        <td><strong>#${escapeHtml(slot.id)}</strong></td>
                        <td>${escapeHtml(advisorLabel(slot))}</td>
                        <td>${escapeHtml(slot.slot_date)}</td>
                        <td>${escapeHtml(slot.start_time)}</td>
                        <td>${escapeHtml(slot.end_time)}</td>
                        <td><span class="badge ${statusClass(slot.status)}">${escapeHtml(statusLabel(slot.status))}</span></td>
                        ${showActions ? `
                            <td>
                                ${slot.status === "available" && canManageTimeSlot(slot) ? `
                                    <div class="row-actions">
                                        <button class="mini-button" data-timeslot-action="edit" data-timeslot='${escapeHtml(JSON.stringify(slot))}'>Sửa</button>
                                        <button class="mini-button mini-button-muted" data-timeslot-action="delete" data-id="${escapeHtml(slot.id)}">Xóa</button>
                                    </div>
                                ` : `<span class="badge badge-muted">Không thể thao tác</span>`}
                            </td>
                        ` : ""}
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

    target.innerHTML = renderMyAppointmentTable(data);
}

function renderMyAppointmentTable(data) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã lịch</th>
                    <th>Dịch vụ</th>
                    <th>Cố vấn</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    <th>Lý do hủy</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((appointment) => `
                    <tr>
                        <td><strong>#${escapeHtml(appointment.id)}</strong></td>
                        <td>${escapeHtml(appointment.service_name || `Dịch vụ #${appointment.service_id}`)}</td>
                        <td>${escapeHtml(appointment.advisor_name || `Cố vấn #${appointment.advisor_id}`)}</td>
                        <td>${escapeHtml(timeRangeLabel(appointment))}</td>
                        <td class="note-cell">${escapeHtml(appointment.note || "Không có")}</td>
                        <td><span class="badge ${statusClass(appointment.status)}">${escapeHtml(statusLabel(appointment.status))}</span></td>
                        <td class="note-cell">${escapeHtml(appointment.cancel_note || "Không có")}</td>
                        <td>
                            ${["pending", "confirmed"].includes(appointment.status) ? `
                                <button class="mini-button mini-button-muted" data-my-appointment-action="cancel" data-id="${escapeHtml(appointment.id)}">Hủy lịch</button>
                            ` : `<span class="badge badge-muted">Không có thao tác</span>`}
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderAppointmentTable(data, showActions) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã lịch</th>
                    <th>Sinh viên</th>
                    <th>Dịch vụ</th>
                    <th>Cố vấn</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    <th>Lý do hủy</th>
                    ${showActions ? "<th>Thao tác</th>" : ""}
                </tr>
            </thead>
            <tbody>
                ${data.map((appointment) => `
                    <tr>
                        <td><strong>#${escapeHtml(appointment.id)}</strong></td>
                        <td>${escapeHtml(appointment.student_name || `Sinh viên #${appointment.student_id}`)}</td>
                        <td>${escapeHtml(appointment.service_name || `Dịch vụ #${appointment.service_id}`)}</td>
                        <td>${escapeHtml(appointment.advisor_name || `Cố vấn #${appointment.advisor_id}`)}</td>
                        <td>${escapeHtml(timeRangeLabel(appointment))}</td>
                        <td class="note-cell">${escapeHtml(appointment.note || "Không có")}</td>
                        <td><span class="badge ${statusClass(appointment.status)}">${escapeHtml(statusLabel(appointment.status))}</span></td>
                        <td class="note-cell">${escapeHtml(appointment.cancel_note || "Không có")}</td>
                        ${showActions ? `
                            <td>
                                <div class="row-actions">
                                    ${appointment.status === "pending" ? `
                                        <button class="mini-button" data-action="confirm" data-id="${appointment.id}">Xác nhận</button>
                                    ` : ""}
                                    ${["pending", "confirmed"].includes(appointment.status) ? `
                                        <button class="mini-button mini-button-muted" data-action="cancel" data-id="${appointment.id}">Hủy</button>
                                    ` : ""}
                                    ${appointment.status === "confirmed" ? `
                                        <button class="mini-button mini-button-success" data-action="complete" data-id="${appointment.id}">Hoàn thành</button>
                                    ` : ""}
                                    ${!["pending", "confirmed"].includes(appointment.status) ? `
                                        <span class="badge badge-muted">Không có thao tác</span>
                                    ` : ""}
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
                ${escapeHtml(advisorLabel(slot))} - ${escapeHtml(slot.slot_date)}
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
        finishPageLoading("services-loading");
        return;
    }

    finishPageLoading("services-loading");
    showElement("services-content");
    document.getElementById("open-service-modal-btn")?.classList.toggle("hidden", !isAdmin());
    setLoading("services-result", "Đang tải danh mục tư vấn...");

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

function resetServiceForm() {
    document.getElementById("service-id") && (document.getElementById("service-id").value = "");
    document.getElementById("service-name") && (document.getElementById("service-name").value = "");
    document.getElementById("service-description") && (document.getElementById("service-description").value = "");
    document.getElementById("service-is-active") && (document.getElementById("service-is-active").value = "true");
    clearMessage("service-message");
}

function openServiceModal(service = null) {
    resetServiceForm();
    document.getElementById("service-modal-title").textContent = service
        ? "Chỉnh sửa danh mục tư vấn"
        : "Thêm danh mục tư vấn";
    if (service) {
        document.getElementById("service-id").value = service.id;
        document.getElementById("service-name").value = service.name || "";
        document.getElementById("service-description").value = service.description || "";
        document.getElementById("service-is-active").value = service.is_active ? "true" : "false";
    }
    openModal("service-modal");
}

async function submitServiceForm(event) {
    event.preventDefault();
    if (!requireRole(["admin"], { guardId: "services-guard", contentId: "services-content" })) {
        return;
    }

    const serviceId = document.getElementById("service-id").value;
    const payload = {
        name: document.getElementById("service-name").value.trim(),
        description: document.getElementById("service-description").value.trim() || null,
        is_active: document.getElementById("service-is-active").value === "true",
    };
    if (!payload.name) {
        setMessage("service-message", "Tên danh mục không được để trống.", true);
        return;
    }

    const url = serviceId ? `${API_BASE}/services/${serviceId}` : `${API_BASE}/services/`;
    const method = serviceId ? "PUT" : "POST";
    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("service-message", getErrorMessage(data, "Lưu danh mục thất bại"), true);
            return;
        }
        closeModal("service-modal");
        setMessage("service-page-message", "Lưu danh mục tư vấn thành công.");
        resetServiceForm();
        await loadServices();
    } catch (error) {
        setMessage("service-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function deleteService(serviceId) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hoặc ngưng hoạt động danh mục này không?")) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/services/${serviceId}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("service-page-message", getErrorMessage(data, "Xóa danh mục thất bại"), true);
            return;
        }
        setMessage("service-page-message", data.message || "Cập nhật danh mục thành công.");
        await loadServices();
    } catch (error) {
        setMessage("service-page-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function loadTimeSlots() {
    if (!requireAuth({
        guardId: "timeslots-guard",
        contentId: "timeslots-content",
        message: "Bạn cần đăng nhập để xem nội dung này.",
        actionText: "Đi đến đăng nhập",
    })) {
        finishPageLoading("timeslots-loading");
        return;
    }

    finishPageLoading("timeslots-loading");
    showElement("timeslots-content");
    await setupTimeslotManagePanel();
    setLoading("timeslots-result", "Đang tải khung giờ tư vấn...");

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

async function setupTimeslotManagePanel() {
    const openButton = document.getElementById("open-timeslot-modal-btn");
    if (openButton) {
        openButton.classList.toggle("hidden", !isStaff());
    }
}

async function prepareTimeslotAdvisorSelect(selectedAdvisorId = "") {
    const advisorSelect = document.getElementById("timeslot-advisor-id");
    const advisorNote = document.getElementById("timeslot-advisor-note");
    const user = getCurrentUser();
    if (!advisorSelect || !user) {
        return;
    }

    if (user.role === "advisor") {
        advisorSelect.innerHTML = `
            <option value="${escapeHtml(user.id)}">${escapeHtml(user.full_name || user.email)} - #${escapeHtml(user.id)}</option>
        `;
        advisorSelect.value = String(user.id);
        advisorSelect.disabled = true;
        if (advisorNote) {
            advisorNote.textContent = `Cố vấn phụ trách: ${user.full_name || user.email}.`;
        }
        return;
    }

    if (user.role === "admin") {
        advisorSelect.disabled = false;
        advisorSelect.innerHTML = `<option value="">Đang tải danh sách cố vấn...</option>`;
        if (advisorNote) {
            advisorNote.textContent = "Admin chọn một cố vấn đang hoạt động để tạo khung giờ.";
        }

        try {
            const response = await fetch(`${API_BASE}/users/advisors/active`, {
                headers: getAuthHeaders(),
            });
            const advisors = await response.json();
            if (!response.ok) {
                advisorSelect.innerHTML = `<option value="">Không tải được danh sách cố vấn</option>`;
                return;
            }
            advisorSelect.innerHTML = Array.isArray(advisors) && advisors.length
                ? `<option value="">Chọn cố vấn phụ trách</option>${advisors.map((advisor) => `
                    <option value="${escapeHtml(advisor.id)}">${escapeHtml(advisor.full_name || advisor.email)} - #${escapeHtml(advisor.id)}</option>
                `).join("")}`
                : `<option value="">Chưa có advisor đang hoạt động</option>`;
            if (selectedAdvisorId) {
                advisorSelect.value = String(selectedAdvisorId);
            }
        } catch {
            advisorSelect.innerHTML = `<option value="">Không tải được danh sách cố vấn</option>`;
        }
    }
}

function resetTimeslotForm() {
    const user = getCurrentUser();
    document.getElementById("timeslot-id") && (document.getElementById("timeslot-id").value = "");
    document.getElementById("timeslot-date") && (document.getElementById("timeslot-date").value = "");
    document.getElementById("timeslot-start") && (document.getElementById("timeslot-start").value = "");
    document.getElementById("timeslot-end") && (document.getElementById("timeslot-end").value = "");
    const advisorSelect = document.getElementById("timeslot-advisor-id");
    if (advisorSelect) {
        if (user?.role === "advisor") {
            advisorSelect.value = String(user.id);
        } else {
            advisorSelect.value = "";
        }
    }
    clearMessage("timeslot-message");
}

async function openTimeSlotModal(timeslot = null) {
    resetTimeslotForm();
    document.getElementById("timeslot-modal-title").textContent = timeslot
        ? "Chỉnh sửa khung giờ"
        : "Thêm khung giờ";
    await prepareTimeslotAdvisorSelect(timeslot?.advisor_id || "");
    if (timeslot) {
        document.getElementById("timeslot-id").value = timeslot.id;
        document.getElementById("timeslot-date").value = timeslot.slot_date;
        document.getElementById("timeslot-start").value = String(timeslot.start_time).slice(0, 5);
        document.getElementById("timeslot-end").value = String(timeslot.end_time).slice(0, 5);
    }
    openModal("timeslot-modal");
}

async function submitTimeslotForm(event) {
    event.preventDefault();
    if (!requireRole(["advisor", "admin"], { guardId: "timeslots-guard", contentId: "timeslots-content" })) {
        return;
    }

    const timeslotId = document.getElementById("timeslot-id").value;
    const payload = {
        slot_date: document.getElementById("timeslot-date").value,
        start_time: document.getElementById("timeslot-start").value,
        end_time: document.getElementById("timeslot-end").value,
    };
    if (!timeslotId) {
        payload.advisor_id = Number(document.getElementById("timeslot-advisor-id").value);
    }
    if (!payload.slot_date || !payload.start_time || !payload.end_time || (!timeslotId && !payload.advisor_id)) {
        setMessage("timeslot-message", "Vui lòng nhập đầy đủ thông tin khung giờ.", true);
        return;
    }

    const url = timeslotId ? `${API_BASE}/timeslots/${timeslotId}` : `${API_BASE}/timeslots/`;
    const method = timeslotId ? "PUT" : "POST";
    try {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("timeslot-message", getErrorMessage(data, "Lưu khung giờ thất bại"), true);
            return;
        }
        closeModal("timeslot-modal");
        setMessage("timeslot-page-message", "Lưu khung giờ thành công.");
        resetTimeslotForm();
        await loadTimeSlots();
    } catch (error) {
        setMessage("timeslot-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function deleteTimeSlot(timeslotId) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khung giờ này không?")) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/timeslots/${timeslotId}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("timeslot-page-message", getErrorMessage(data, "Xóa khung giờ thất bại"), true);
            return;
        }
        setMessage("timeslot-page-message", data.message || "Xóa khung giờ thành công.");
        await loadTimeSlots();
    } catch (error) {
        setMessage("timeslot-page-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function loadMyAppointments() {
    if (!requireRole(["student"], { guardId: "my-appointments-guard", contentId: "my-appointments-content" })) {
        return;
    }

    setLoading("my-appointments-result", "Đang tải lịch hẹn của tôi...");

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

    setBookingFormLoading(true);

    try {
        const [servicesResponse, timeslotsResponse] = await Promise.all([
            fetch(`${API_BASE}/services/`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/timeslots/`, { headers: getAuthHeaders() }),
        ]);
        const services = await servicesResponse.json();
        const timeslots = await timeslotsResponse.json();

        if (!servicesResponse.ok) {
            setBookingFormLoading(false);
            setMessage("booking-message", getErrorMessage(services, "Bạn cần đăng nhập trước"), true);
            return;
        }
        if (!timeslotsResponse.ok) {
            setBookingFormLoading(false);
            setMessage("booking-message", getErrorMessage(timeslots, "Không tải được khung giờ tư vấn"), true);
            return;
        }

        renderSelectOptions(services, timeslots);
        setBookingFormLoading(false);
        if (showSuccessMessage) {
            setMessage("booking-message", "Đã tải dữ liệu đặt lịch.");
        }
    } catch (error) {
        setBookingFormLoading(false);
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

async function cancelAppointmentWithReason(appointmentId, messageTargetId, reloadCallback) {
    const reason = window.prompt("Nhập lý do hủy lịch hẹn:");
    if (reason === null) {
        return;
    }
    const cancelNote = reason.trim();
    if (!cancelNote) {
        setMessage(messageTargetId, "Lý do hủy không được để trống.", true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ cancel_note: cancelNote }),
        });
        const data = await response.json();

        if (!response.ok) {
            setMessage(messageTargetId, getErrorMessage(data, "Hủy lịch thất bại"), true);
            return;
        }

        setMessage(messageTargetId, "Hủy lịch thành công.");
        await reloadCallback();
    } catch (error) {
        setMessage(messageTargetId, `Lỗi kết nối: ${error.message}`, true);
    }
}

async function loadAdvisorAppointments() {
    if (!requireRole(["advisor", "admin"], { guardId: "advisor-appointments-guard", contentId: "advisor-appointments-content" })) {
        return;
    }

    setLoading("advisor-appointments-result", "Đang tải danh sách lịch hẹn...");

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
    if (action === "cancel") {
        await cancelAppointmentWithReason(
            appointmentId,
            "advisor-appointments-message",
            loadAdvisorAppointments
        );
        return;
    }

    const endpoints = {
        confirm: "confirm",
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

function bindMyAppointmentActions() {
    const target = document.getElementById("my-appointments-result");
    if (!target) {
        return;
    }
    target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-my-appointment-action='cancel']");
        if (!button) {
            return;
        }
        cancelAppointmentWithReason(button.dataset.id, "my-appointments-message", loadMyAppointments);
    });
}

function bindServiceActions() {
    const target = document.getElementById("services-result");
    if (!target) {
        return;
    }
    target.addEventListener("click", (event) => {
        const editButton = event.target.closest("[data-service-action='edit']");
        const deleteButton = event.target.closest("[data-service-action='delete']");
        if (editButton) {
            const service = JSON.parse(editButton.dataset.service);
            openServiceModal(service);
        }
        if (deleteButton) {
            deleteService(deleteButton.dataset.id);
        }
    });
}

function bindTimeSlotActions() {
    const target = document.getElementById("timeslots-result");
    if (!target) {
        return;
    }
    target.addEventListener("click", (event) => {
        const editButton = event.target.closest("[data-timeslot-action='edit']");
        const deleteButton = event.target.closest("[data-timeslot-action='delete']");
        if (editButton) {
            const timeslot = JSON.parse(editButton.dataset.timeslot);
            openTimeSlotModal(timeslot);
        }
        if (deleteButton) {
            deleteTimeSlot(deleteButton.dataset.id);
        }
    });
}

async function loadAdminUsers() {
    if (!requireRole(["admin"], { guardId: "admin-users-guard", contentId: "admin-users-content" })) {
        finishPageLoading("admin-users-loading");
        return;
    }

    finishPageLoading("admin-users-loading");
    showElement("admin-users-content");
    setLoading("admin-users-result", "Đang tải danh sách người dùng...");

    try {
        const response = await fetch(`${API_BASE}/users/`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok) {
            setEmpty("admin-users-result", getErrorMessage(data, "Không tải được danh sách người dùng"));
            return;
        }
        renderAdminUsers(data);
    } catch (error) {
        setEmpty("admin-users-result", `Lỗi kết nối: ${error.message}`);
    }
}

function renderAdminUsers(data) {
    const target = document.getElementById("admin-users-result");
    if (!target) {
        return;
    }
    if (!Array.isArray(data) || data.length === 0) {
        setEmpty("admin-users-result", "Chưa có người dùng nào.");
        return;
    }

    target.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Mã</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((user) => `
                    <tr>
                        <td><strong>#${escapeHtml(user.id)}</strong></td>
                        <td>${escapeHtml(user.full_name)}</td>
                        <td>${escapeHtml(user.email)}</td>
                        <td>
                            <select data-user-role="${escapeHtml(user.id)}">
                                ${["student", "advisor", "admin"].map((role) => `
                                    <option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>
                                `).join("")}
                            </select>
                        </td>
                        <td>
                            <span class="badge ${user.is_active ? "badge-success" : "badge-danger"}">
                                ${user.is_active ? "Đang hoạt động" : "Đã khóa"}
                            </span>
                        </td>
                        <td>
                            <div class="row-actions">
                                <button class="mini-button" data-user-action="role" data-id="${escapeHtml(user.id)}">Lưu role</button>
                                <button class="mini-button mini-button-muted" data-user-action="status" data-id="${escapeHtml(user.id)}" data-active="${user.is_active}">
                                    ${user.is_active ? "Khóa" : "Mở khóa"}
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

async function updateUserRole(userId) {
    const select = document.querySelector(`[data-user-role="${userId}"]`);
    if (!select) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ role: select.value }),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("admin-users-message", getErrorMessage(data, "Đổi role thất bại"), true);
            return;
        }
        setMessage("admin-users-message", "Đổi role thành công.");
        await loadAdminUsers();
    } catch (error) {
        setMessage("admin-users-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

async function updateUserStatus(userId, currentActive) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ is_active: !currentActive }),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage("admin-users-message", getErrorMessage(data, "Cập nhật trạng thái thất bại"), true);
            return;
        }
        setMessage("admin-users-message", "Cập nhật trạng thái tài khoản thành công.");
        await loadAdminUsers();
    } catch (error) {
        setMessage("admin-users-message", `Lỗi kết nối: ${error.message}`, true);
    }
}

function bindAdminUserActions() {
    const target = document.getElementById("admin-users-result");
    if (!target) {
        return;
    }
    target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-user-action]");
        if (!button) {
            return;
        }
        if (button.dataset.userAction === "role") {
            updateUserRole(button.dataset.id);
        }
        if (button.dataset.userAction === "status") {
            updateUserStatus(button.dataset.id, button.dataset.active === "true");
        }
    });
}

async function bootstrapAuthState() {
    runtimeUser = getStoredUser();
    if (getToken()) {
        try {
            // Luôn kiểm tra lại token trước khi render nội dung theo quyền.
            await fetchCurrentUser();
        } catch {
            clearToken();
            clearStoredUser();
        }
    }
    updateNavbar();
    updateTokenStatus();
    document.body.classList.remove("app-booting");
}

async function initializePage() {
    await bootstrapAuthState();

    const path = window.location.pathname;
    if (path === "/login" && isAuthenticated() && getCurrentRole()) {
        redirectByRole();
        return;
    }
    if (path === "/dashboard") {
        if (requireAuth({ guardId: "dashboard-guard", contentId: "dashboard-content", redirect: true })) {
            finishPageLoading("dashboard-loading");
            showElement("dashboard-content");
            await loadProfile();
        } else {
            finishPageLoading("dashboard-loading");
        }
    }
    if (path === "/booking-page") {
        if (requireRole(["student"], { guardId: "booking-guard", contentId: "booking-content" })) {
            finishPageLoading("booking-loading");
            showElement("booking-content");
            await loadBookingData(false);
        } else {
            finishPageLoading("booking-loading");
        }
    }
    if (path === "/my-appointments-page") {
        if (requireRole(["student"], { guardId: "my-appointments-guard", contentId: "my-appointments-content" })) {
            finishPageLoading("my-appointments-loading");
            showElement("my-appointments-content");
            await loadMyAppointments();
        } else {
            finishPageLoading("my-appointments-loading");
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
            finishPageLoading("advisor-appointments-loading");
            showElement("advisor-appointments-content");
            await loadAdvisorAppointments();
        } else {
            finishPageLoading("advisor-appointments-loading");
        }
    }
    if (path === "/admin-users-page") {
        await loadAdminUsers();
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
    document.getElementById("profile-form")?.addEventListener("submit", submitProfileForm);
    document.getElementById("load-services-btn")?.addEventListener("click", loadServices);
    document.getElementById("open-service-modal-btn")?.addEventListener("click", () => openServiceModal());
    document.getElementById("load-timeslots-btn")?.addEventListener("click", loadTimeSlots);
    document.getElementById("open-timeslot-modal-btn")?.addEventListener("click", () => openTimeSlotModal());
    document.getElementById("load-my-appointments-btn")?.addEventListener("click", loadMyAppointments);
    document.getElementById("load-booking-data-btn")?.addEventListener("click", () => loadBookingData(true));
    document.getElementById("booking-form")?.addEventListener("submit", createAppointment);
    document.getElementById("load-advisor-appointments-btn")?.addEventListener("click", loadAdvisorAppointments);
    document.getElementById("service-form")?.addEventListener("submit", submitServiceForm);
    document.getElementById("timeslot-form")?.addEventListener("submit", submitTimeslotForm);
    document.getElementById("load-admin-users-btn")?.addEventListener("click", loadAdminUsers);
    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => closeModal(button.dataset.closeModal));
    });
    bindMyAppointmentActions();
    bindServiceActions();
    bindTimeSlotActions();
    bindAdvisorActions();
    bindAdminUserActions();

    initializePage();
});
