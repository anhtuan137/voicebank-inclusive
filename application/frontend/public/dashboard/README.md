# VCB Admin Console · VoiceBank Inclusive

Phân hệ **Quản trị & Vận hành** (mục 4.8 Hồ sơ dự thi HackAIthon 2026 — đội DATAXTRA) cho sản phẩm
**VoiceBank Inclusive** — trợ lý tài chính AI giọng nói "An" nhúng trong VCB Digibank.

Dashboard cho nhân viên Operator/Admin Vietcombank **giám sát hội thoại, quản lý ticket, theo dõi
hiệu suất trợ lý ảo và xử lý hàng đợi chuyển nhân viên** theo thời gian thực.

> Toàn bộ số liệu là **dữ liệu mô phỏng** (mock data) phục vụ demo, không phải dữ liệu khách hàng thật.

## Cách chạy

Web tĩnh thuần (HTML/CSS/JS vanilla), không cần build. Dữ liệu nằm trong các file JSON ở `data/`
và được nạp lúc khởi động bằng `fetch`, nên **cần chạy qua một máy chủ cục bộ** (trình duyệt chặn
`fetch` file JSON khi mở trực tiếp bằng `file://`):

```bash
cd application/frontend/legacy-dashboard
python3 -m http.server 8080
# mở http://localhost:8080
```

> Nếu nhấp đúp mở bằng `file://`, ứng dụng sẽ hiện hộp thoại hướng dẫn chạy qua server.

## Cấu trúc

```
vcb-admin-console/
├── index.html              # Entry point
├── data/                   # ★ MOCK DATA — sửa ở đây, giao diện tự đổi theo
│   ├── config.json         #   periods + meta hiển thị (kênh/trạng thái/rủi ro)
│   ├── overview.json       #   KPI + biểu đồ Tổng quan (theo từng kỳ), cảnh báo
│   ├── monitor.json        #   phiên hội thoại + transcript + hàng đợi escalation
│   ├── tickets.json        #   ticket + thread trao đổi + widget
│   ├── reports.json        #   KPI + biểu đồ Báo cáo (theo từng kỳ), heatmap, KPI mục tiêu
│   ├── settings.json       #   RBAC + bảo mật
│   └── notifications.json  #   danh sách thông báo (chuông)
├── assets/
│   ├── css/styles.css      # Toàn bộ giao diện
│   ├── img/vcb-logo.png    # Logo Vietcombank
│   └── js/app.js           # Nạp data + render động + xử lý tương tác
└── assets/vcb_admin_console_interactive.html   # Bản tĩnh gốc (tham chiếu)
```

## Lọc theo kỳ thời gian (data đổi → biểu đồ đổi)

Mỗi file `overview.json` / `reports.json` chứa khối `byPeriod` với 4 kỳ: **Hôm nay · 7 ngày · 30 ngày · Quý này**.
Chọn kỳ ở nút 📅 trên topbar hoặc dropdown "… qua⌄" trên từng card → KPI và biểu đồ render lại theo dữ liệu kỳ đó.
Thêm/sửa kỳ: cập nhật mảng `periods` trong `config.json` và khối `byPeriod` tương ứng.

## Tính năng tương tác (demo được)

| Trang | Thao tác |
|-------|----------|
| **Tổng quan** | KPI, biểu đồ lưu lượng 7 ngày, donut phân loại yêu cầu, top lý do escalation, cảnh báo — tất cả render từ data |
| **Giám sát hội thoại** | Click một phiên → xem **transcript đầy đủ** + ý định + cảm xúc; **tìm kiếm** lọc phiên; nút **Tiếp quản / Tạo ticket / Đánh dấu rủi ro**; hàng đợi escalation; đồng hồ & số phiên cập nhật real-time |
| **Ticket hỗ trợ** | Click ticket → tóm tắt AI + SLA + đề xuất hành động; **chip lọc** theo trạng thái; tìm kiếm; nút **Gọi lại / Giao NV / Gửi email / Đóng ticket** thay đổi trạng thái thật |
| **Báo cáo** | Biểu đồ người dùng/phiên, kênh sử dụng, heatmap intent, hiệu quả trợ năng, **bộ chỉ số mục tiêu KPI Pilot**, xuất PDF/Excel |
| **Cài đặt** | RBAC; **công tắc bật/tắt** Che PII / Audit log / Escalation tự động |

Các luồng nổi bật: tạo ticket từ phiên hội thoại sẽ xuất hiện ngay ở trang Ticket; tiếp quản phiên đổi
trạng thái sang "NV tiếp quản"; đóng ticket chuyển sang "Đã đóng".

## Tùy biến dữ liệu

Mọi nội dung demo nằm trong các file JSON ở thư mục [`data/`](data/). Sửa file JSON tương ứng (ví dụ
thêm một phiên trong `monitor.json`, đổi số KPI trong `overview.json`) rồi tải lại trang — giao diện
cập nhật theo, **không cần đụng vào `app.js`**. `app.js` chỉ chứa logic nạp dữ liệu + render + tương tác.
