# VCB Admin Console — Cẩm nang Dashboard (nghiệp vụ + dữ liệu)

> **Một tài liệu duy nhất** mô tả console vận hành phục vụ thật tại `/dashboard`
> (mã nguồn: [application/frontend/public/dashboard/](../application/frontend/public/dashboard/)).
>
> Mỗi phần gồm **hai lớp**:
> - 🟢 **Nghiệp vụ** — con số nghĩa là gì, đọc thế nào, ngưỡng tốt/xấu, kích hoạt hành động gì (dành cho Operator/Admin/Analyst).
> - ⚙️ **Dữ liệu & liên kết** — lấy từ đâu, nối với nhau trong tab và giữa các tab ra sao (dành cho người code/bảo trì).
>
> Phạm vi: **5 tab nghiệp vụ** — Tổng quan · Giám sát hội thoại · An tâm Gia đình · Ticket hỗ trợ · Báo cáo
> (tab *Cài đặt* chỉ nhắc ở phụ lục). Mọi số liệu hiện tại là **dữ liệu mô phỏng** phục vụ demo (đội DATAXTRA, HackAIthon 2026).

---

## 0. Bức tranh lớn

### 0.1 🟢 Console này để làm gì?
VoiceBank Inclusive là trợ lý tài chính AI ("**An**") nhúng trong VCB Digibank, đứng trên hai trụ cột:
**Dự báo** (phát hiện sớm rủi ro/nhu cầu) và **Thấu hiểu** (đọc cảm xúc, hỗ trợ nhóm yếu thế).
Console vận hành là "phòng điều khiển" để con người **giám sát chất lượng trợ lý, can thiệp khi cần, và đo hiệu quả kinh doanh.**

Ba vai trò đọc dashboard với ba câu hỏi khác nhau:

| Vai trò | Câu hỏi chính | Tab quan tâm nhất |
|---|---|---|
| **Operator** (giám sát viên) | "Phiên nào đang có nguy cơ, tôi cần nhảy vào ngay không?" | Giám sát hội thoại, Ticket |
| **Admin** (quản trị vận hành) | "Hệ thống có ổn định, an toàn, đúng quy định không?" | Tổng quan, Cài đặt, An tâm Gia đình |
| **Analyst / Quản lý** | "Trợ lý có đang tạo ra giá trị kinh doanh không?" | Báo cáo, Tổng quan |

**Logic xuyên suốt cần nhớ:**
- Toàn bộ console chỉ nói về **một kênh: trợ lý ảo "Bot"**. Mọi số liệu là về chất lượng & hiệu quả của An.
- Mọi tab phục vụ một vòng lặp vận hành: **Phát hiện → Hiểu ngữ cảnh → Can thiệp → Theo dõi đến khi đóng → Học để cải thiện.**
- "Chuyển nhân viên" (escalation) **không phải thất bại** — nó là van an toàn. Vấn đề là *chuyển đúng lúc, đúng lý do, và giảm dần*.

### 0.2 ⚙️ Nền tảng dữ liệu chung
Console là một trang tĩnh render bởi JS thuần ([assets/js/app.js](../application/frontend/public/dashboard/assets/js/app.js)),
mô hình **state-driven**: nạp dữ liệu một lần → dựng `state` → mọi tab re-render khi bộ lọc đổi.

**Đường đi dữ liệu khi mở console:**
1. **Probe** `GET http://localhost:18890/health` (timeout 2s). Fail → hiện màn *"Không kết nối được database"* và **dừng**
   (console bắt buộc có mockapi, client không tự đọc file tĩnh).
2. Nạp song song 8 "section" qua `GET /api/v1/dashboard/{section}`:
   `config, overview, monitor, tickets, reports, settings, notifications, family`.
3. Gộp về một object `VB` → render tất cả.

Backend ([mockapi/routers/dashboard.py](../mockapi/routers/dashboard.py)) trả về **đúng cấu trúc JSON** như file tĩnh
trong [data/](../application/frontend/public/dashboard/data/), với 2 chế độ:

| Chế độ | Khi nào | Nguồn |
|---|---|---|
| **Postgres** (live) | có DB | Bảng SQL: `conversations`, `conversation_messages`, `tickets`, `ticket_messages`, `escalations`, `notifications`, `settings_*`; phần chart/snapshot lấy từ `analytics_snapshots`. |
| **JSON fallback** | không DB | Đọc thẳng `data/*.json`. |

> ⚠️ Hệ quả: **Tổng quan / Báo cáo / Gia đình luôn là snapshot** (tổng hợp sẵn). Chỉ **Giám sát / Ticket** (và Cài đặt/Thông báo)
> có dữ liệu *live* khi chạy Postgres. File `data/*.json` là **seed** cho cả hai chế độ.

**Quy ước hiển thị xuyên suốt:**
- **Kênh = "Bot"** ở mọi nơi (mọi kênh thật `chat/call/zalo/messenger` đều quy về nhãn "Bot").
- **Bộ chọn kỳ** `today / 7d / 30d / quarter`: đổi một chỗ → đồng bộ nhãn mọi nút và re-render **Tổng quan + Ticket + Báo cáo**
  (Giám sát & Gia đình không phụ thuộc kỳ).
- **KPI card** dùng chung: `{label, value, delta, sub, dir(up/down), icon}`; emoji được map sang SVG 2D.
- **Badge màu** lấy từ bảng meta trong `config.json` (`statusMeta`, `riskMeta`, `ticketStatusMeta`). Tiền tệ: int VND.

---

## 1. Tab "Tổng quan" — Sức khoẻ vận hành trong một màn hình

🟢 **Mục đích:** trả lời trong 10 giây *"Hôm nay/tuần này hệ thống có khoẻ không?"*. Màn hình lãnh đạo liếc đầu ngày,
Operator mở khi vào ca.
⚙️ **Nguồn:** `GET /dashboard/overview` ← `overview.json` (luôn snapshot).

### 1.1 Bốn chỉ số sống còn (KPI)
Đọc 4 ô như "nhịp tim" của trợ lý — **không đọc lẻ**:

- **Tổng phiên** (vd 112.300/7 ngày) — *quy mô sử dụng*. Tăng là tốt, nhưng phải đọc cùng 3 chỉ số còn lại.
- **Tỷ lệ tự phục vụ** (~77%) — *trái tim bài toán ROI*: % việc Bot tự xử lý trọn. Mỗi % tăng = giảm tải tổng đài thật.
- **Tỷ lệ chuyển tổng đài** (~23%) — mặt còn lại. **Giảm là tốt** (mũi tên xuống = tích cực); tăng đột ngột = Bot đang "bí".
- **CSAT** (4,5–4,6/5) — *thước đo cảm xúc*, trụ cột Thấu hiểu. Dưới ~4,2 là báo động dù số kỹ thuật vẫn đẹp.

> **Đọc đúng:** "Phiên ↑ + Tự phục vụ ↑ + Chuyển tổng đài ↓ + CSAT ↑" = một kỳ khoẻ mạnh. Một mũi tên đi sai hướng = cần điều tra.

⚙️ Mỗi kỳ có bộ KPI riêng trong `byPeriod[kỳ].kpis`.

### 1.2 Các khối còn lại
| Khối | 🟢 Ý nghĩa nghiệp vụ | ⚙️ Nguồn |
|---|---|---|
| **Lưu lượng phiên Bot** (đường) | Nhịp sử dụng theo thời gian → nhận diện giờ cao điểm (bố trí trực), phát hiện sụt bất thường (sự cố), đo hiệu quả truyền thông. | `byPeriod[kỳ].traffic` |
| **Phân loại yêu cầu** (tròn) | Khách đến để làm gì: Tra cứu ~45% › Chuyển tiền ~29% › Tiết kiệm ~16% › Hỗ trợ ~10%. "Hỗ trợ" cao bất thường = khách đang vướng. | `byPeriod[kỳ].requestMix` |
| **Người dùng cần trợ năng** | Phần "Inclusive" — lý do tồn tại của sản phẩm. % dùng Chữ lớn/Đọc màn hình/Giọng nói **tăng đều là tốt** (bằng chứng phục vụ người yếu thế). | `accessibility` (delta scale theo kỳ) |
| **Top lý do chuyển nhân viên** (bar) | Bản đồ điểm yếu của Bot → ưu tiên cải tiến cái đứng đầu. "Trục trặc kỹ thuật" cao = lỗi hạ tầng, không phải Bot. | `escalationReasons` (scale theo kỳ) |
| **Cảnh báo gần đây** (bảng) | Sổ trực ca: mức độ + trạng thái. "Cao" + "Đang xử lý" = làm ngay. Nơi rủi ro hệ thống nổi lên sớm. | `alerts` (có ô tìm kiếm) |

⚙️ **Liên kết:** ô search chỉ lọc bảng *Cảnh báo*; bộ chọn kỳ dùng chung toàn console.
🟢 **Liên kết ngữ nghĩa:** cảnh báo "tăng từ khoá *lừa đảo/mất tiền*" thường khớp phiên rủi ro cao ở **Giám sát** và cảnh báo ở **Gia đình**.

---

## 2. Tab "Giám sát hội thoại" — Phòng trực thời gian thực

🟢 **Mục đích:** chỗ Operator **ngồi trực**, theo dõi từng cuộc trò chuyện đang diễn ra và **can thiệp kịp thời**
trước khi khách bỏ đi hoặc một vụ gian lận hoàn tất.
⚙️ **Nguồn:** `GET /dashboard/monitor`. Postgres → conversations/escalations **live** + KPI snapshot; JSON → `monitor.json`.

### 2.1 Bốn chỉ số realtime
- **Đang hoạt động** (vd 186) — tải hiện tại Operator đang gánh.
- **Tỷ lệ bot hiểu đúng** (~92%) — độ tin cậy TB; tụt mạnh = có làn sóng câu hỏi lạ → báo đội nội dung.
- **Phiên cần can thiệp** — số phiên **rủi ro Cao**. **Con số Operator phải kéo về 0.** Mỗi đơn vị là một khách trong tình huống nhạy cảm.
- **Thời gian phản hồi TB** (~3,2s) — chậm dần = hạ tầng quá tải.

⚙️ KPI ở đây **tính lại từ danh sách phiên đang lọc** (không đọc số tĩnh): "hiểu đúng" = TB độ tin cậy intent;
"cần can thiệp" = đếm phiên risk cao; "đang hoạt động" dao động giả lập realtime mỗi 4s.

### 2.2 Danh sách phiên + ba "nhãn màu" cần đọc
Mỗi phiên kể câu chuyện qua ba nhãn:
- **Ý định + độ tin cậy**: Bot nghĩ khách muốn gì, chắc bao nhiêu %. Tin cậy thấp (71–74%) = Bot đang mò → dễ chuyển người.
- **Trạng thái**: *Bot xử lý* (xanh) › *Chờ xác minh* (cam) › *Chuyển nhân viên* (xanh dương) › *NV tiếp quản* (tím).
- **Mức rủi ro**: Thấp / Trung bình / **Cao** — bộ lọc ưu tiên việc gấp.

> **Logic ưu tiên thực chiến:** rủi ro **Cao** + cảm xúc **Tiêu cực** + độ tin cậy **thấp** = nhảy vào trước tiên.
> (Ví dụ phiên khiếu nại "bị trừ 5 triệu không rõ" của khách Lê Thị Hương hội đủ cả ba.)

### 2.3 Panel chi tiết — đọc trước khi can thiệp
- **Hội thoại**: bản ghi đối thoại kèm **cảm xúc từng câu** (trụ cột Thấu hiểu) + chỉ số ý định/cảm xúc tổng.
- **Thông tin**: hồ sơ khách (phân khúc Gen Z…). **Số dư bị che (PII)** — đúng quy định bảo vệ dữ liệu cá nhân (NĐ13).
- **Lịch sử**: khách từng tương tác gì → tránh hỏi lại.
- **Ghi chú**: bàn giao giữa ca trực.

### 2.4 Bốn hành động can thiệp & hệ quả
- **Nghe bản ghi** — kiểm chứng khi có tranh chấp.
- **Tiếp quản** — người thật thay Bot khi khách bức xúc/việc vượt khả năng. ⚙️ đổi trạng thái phiên → "NV tiếp quản".
- **Tạo ticket** — biến cuộc trò chuyện thành việc theo dõi đến khi xong. ⚙️ **Đây là liên kết code mạnh nhất giữa hai tab:**
  sinh `TK-2025-####` (subject=intent, ưu tiên theo risk), lưu **truy vết về phiên gốc** (`source_conv_id`), hiện ngay ở Tab Ticket.
- **Đánh dấu rủi ro** — Operator nâng cảnh báo thủ công khi "ngửi" thấy bất thường Bot chưa nhận ra. ⚙️ risk→"Cao", KPI tăng theo.

### 2.5 Hàng đợi Escalations
🟢 Phòng chờ chuyển người, có **độ ưu tiên + thời gian chờ**. Đảm bảo không ai chờ quá lâu, nhất là vụ "Cao" như khoá thẻ khẩn cấp
(chờ lâu = rủi ro tài chính thật). ⚙️ `escalations[]`.

---

## 3. Tab "An tâm Gia đình" — Sản phẩm xã hội & ranh giới đạo đức

🟢 **Mục đích:** quản lý tính năng để **người trẻ giám hộ tài chính từ xa cho cha mẹ lớn tuổi** — cha mẹ tự giao dịch
nhưng có "lưới an toàn" chống lừa đảo. Triết lý in đậm trên đầu tab: **"nhận cảnh báo, KHÔNG nhận quyền".**
⚙️ **Nguồn:** `GET /dashboard/family` ← `family.json` (luôn snapshot). Tab này **độc lập** về code (không chia sẻ kỳ, không feed tab khác).

> **Thuật ngữ dễ nhầm — phải nắm:** **"guardian" = người trẻ (con)**, **"dependent" = cha mẹ**.
> Con là người *nhận cảnh báo*; cha mẹ vẫn là chủ tài khoản toàn quyền.

### 3.1 Bốn chỉ số
- **Liên kết đang hoạt động** — quy mô áp dụng.
- **% cha mẹ tự hoàn tất giao dịch** (~92%) — **chỉ số chứng minh triết lý**: cha mẹ vẫn tự chủ, con không làm thay.
  Thấp đi = con đang "làm hộ" quá nhiều, sai tinh thần.
- **Cảnh báo gửi/đọc** (vd 356/311) — lưới an toàn có đến tay con không.
- **Độ trễ phát hiện → con nhận** (~8,2s) — **tốc độ cứu hộ**, càng thấp càng tốt (mũi tên xuống = tích cực).

### 3.2 Bảng liên kết & 6 quy tắc bất biến (kể cả Admin không được phá)
Mỗi liên kết thể hiện việc tuân thủ một bộ quy tắc đạo đức/pháp lý:

- **BR-FAM-01 Đồng thuận hai phía:** chỉ "Đang hoạt động" khi **cha mẹ tự đồng ý bằng giọng nói + eKYC**.
  Trạng thái *"Chờ cha mẹ đồng ý"* = chưa đủ điều kiện; Admin **không** kích hoạt thay.
- **BR-FAM-02 Con không có quyền giao dịch:** cột quyền luôn ghi "Không — chỉ nhận cảnh báo" (chống lạm dụng).
- **BR-FAM-04 Cha mẹ thu hồi bất cứ lúc nào:** nút "Thu hồi" → con ngừng nhận mọi thông báo ngay.
- **BR-FAM-05 Mặc định ẩn số dư:** con không thấy số dư cha mẹ trừ khi cha mẹ chủ động opt-in.
- **BR-FAM-06 Giới hạn người giám hộ:** tối đa 4 con/cha mẹ — tránh "vây" một người già.
- **BR-FAM-07 Đẩy cảnh báo đồng thời:** cảnh báo đến cha mẹ **và** (các) con cùng lúc — minh bạch.

⚙️ Hành động (client-side, tôn trọng BR-FAM): Thu hồi/Hủy → trạng thái "revoked" + ẩn số dư + ghi mốc thu hồi;
Toggle số dư → đổi `showBalance`; gửi lại yêu cầu/xem audit → thông báo.

### 3.3 Cảnh báo gia đình gần đây
🟢 Lưới an toàn đang chạy: "Nghi vấn lừa đảo (chuyển khoản lạ)", "Giao dịch lớn ngoài thói quen",
"Xu hướng lừa đảo vùng" (tín hiệu cộng đồng), "OTP bất thường" — mỗi dòng cho biết đẩy tới ai, độ trễ, đã đọc chưa.
Bằng chứng sống động nhất về giá trị bảo vệ người yếu thế.

---

## 4. Tab "Ticket hỗ trợ" — Đảm bảo không việc nào rơi rớt

🟢 **Mục đích:** vòng đời "sau cuộc trò chuyện". Việc chưa giải quyết trọn ngay thành **ticket** và phải được **theo đến khi đóng,
đúng cam kết thời gian (SLA)** — cam kết chất lượng dịch vụ với khách.
⚙️ **Nguồn:** `GET /dashboard/tickets`. Postgres → `tickets` + `ticket_messages` **live** + filters/widgets snapshot; JSON → `tickets.json`.

### 4.1 Bốn chỉ số
- **Ticket mở** — khối lượng tồn đọng.
- **SLA đúng hạn** (~92,6%) — **lời hứa với khách có được giữ không**; dưới ngưỡng là mất uy tín.
- **Ticket ưu tiên Cao** — số việc nóng đang chờ.
- **Thời gian xử lý TB** — đội phản ứng nhanh hay chậm.

⚙️ KPI **phái sinh từ danh sách ticket** (mở = status≠closed; SLA = % slaCls≠đỏ; ưu tiên cao = đếm priorityCls đỏ);
hai số đầu scale theo kỳ.

### 4.2 SLA — khái niệm trung tâm
**SLA = thời hạn cam kết xử lý.** Mỗi ticket có đồng hồ đếm ngược, đọc theo màu:
**Xanh** = còn nhiều thời gian · **Cam** = sắp hết hạn, cần thúc · **Đỏ "Quá hạn"** = đã lỗi hẹn, ưu tiên cao nhất.

> Ví dụ: ticket "ATM nuốt thẻ" **quá hạn 12 phút + ưu tiên Cao** phải xử lý trước "quên mật khẩu" còn 55 phút,
> **dù tạo sau** — logic phân loại theo *gấp* chứ không theo *đến trước*.

### 4.3 Panel chi tiết — bộ công cụ của chuyên viên
- **Tóm tắt AI**: An tự tóm tắt vụ việc + độ tin cậy + **đề xuất các bước xử lý** → chuyên viên vào việc ngay
  (trợ lý cho cả nhân viên, không chỉ cho khách).
- **Trao đổi**: toàn bộ luồng khách ↔ Bot ↔ nhân viên — bàn giao liền mạch.
- **Thông tin KH** (che PII) · **Lịch sử**.
- Hành động: **Gọi lại / Giao nhân viên / Gửi email / Đóng ticket**. "Đóng" chỉ khi vấn đề thực sự xong.
  ⚙️ Giao/Đóng ghi xuống DB (PATCH).

### 4.4 Ba widget phân tích đáy trang
- **Phân bổ theo kênh** — việc đến từ đâu (quy về Bot).
- **Hiệu suất SLA** (đúng/quá hạn) — sức khoẻ cam kết dịch vụ trong nháy mắt.
- **Top chủ đề** — vấn đề lặp nhiều nhất = tín hiệu cải tiến gốc rễ (vd "Không chuyển tiền được" đứng đầu → có thể là
  sự cố tích hợp cần sửa tận gốc thay vì xử lý từng ticket).

⚙️ Cả ba widget tính lại từ **tập ticket đang lọc** (reactive theo search/filter/sort).
🟢 **Liên kết tab:** phần lớn ticket sinh ra từ tab **Giám sát**, giữ truy vết về phiên gốc → lần ngược Ticket → cuộc trò chuyện ban đầu.

---

## 5. Tab "Báo cáo & phân tích" — Trợ lý có đáng đồng tiền không?

🟢 **Mục đích:** góc nhìn **quản lý/lãnh đạo** — chứng minh hiệu quả kinh doanh, hành vi người dùng, mức đạt mục tiêu pilot.
Tab để ra quyết định *đầu tư tiếp / mở rộng / điều chỉnh*.
⚙️ **Nguồn:** `GET /dashboard/reports` ← `reports.json` (luôn snapshot); mọi khối phụ thuộc kỳ, nhiều phần scale từ baseline 7d.

| Khối | 🟢 Ý nghĩa |
|---|---|
| **4 KPI tăng trưởng** | Người dùng tương tác · **Giữ chân/quay lại** (người *quay lại* mới là giá trị thật) · Tỷ lệ trợ năng · Hài lòng theo kênh. |
| **Người dùng vs Phiên** (đường đôi) | Phiên tăng nhanh hơn người = mỗi người dùng nhiều hơn (gắn bó hơn). |
| **Heatmap intent theo ngày** (Top 5) | Bản đồ nhiệt nhu cầu → dự báo tải, chuẩn bị nội dung, bắt mùa vụ (cuối tháng tăng "thanh toán hoá đơn"). Nuôi trụ cột **Dự báo**. |
| **Hiệu quả trợ năng** (bảng) | Mỗi tính năng có số người + tỷ lệ + **CSAT riêng** + xu hướng. CSAT cao ở nhóm trợ năng = sản phẩm thật sự dễ dùng cho người yếu thế. |
| **Bộ chỉ số mục tiêu (KPI Pilot)** | **Bảng điểm cam kết dự án** (mục tiêu vs thực tế vs Đạt/Chưa đạt) — xem chi tiết dưới. |
| **Insight cho quản lý** | 3 nhận định bằng lời — tóm tắt điều hành để dán vào báo cáo. |

**KPI Pilot — bảng nghiệm thu:**
- **Containment ≥ 60%** (Bot tự xử lý trọn) — thực tế ~87% ✅: lý do kinh tế cốt lõi.
- **Hoàn tất tác vụ ≥ 85%** — ~88,4% ✅.
- **CSAT ≥ 4,2/5** — ~4,6 ✅: chất lượng cảm xúc.
- **WER ≤ 12%** (tỷ lệ nghe-nhầm giọng nói) — ~9,8% ✅: nền tảng trải nghiệm giọng nói tiếng Việt.
- **Giảm tải tổng đài 20–40%** — ~34% ✅: tiết kiệm chi phí thật.

→ Đây là tab trả lời ban giám khảo/lãnh đạo: *"dự án có đạt cam kết không?"* — câu trả lời nằm ở cột Đạt/Chưa đạt.

---

## 6. Bộ lọc "Kỳ thời gian" — ống kính đổi theo người đọc

Nút **Hôm nay / 7 ngày / 30 ngày / Quý** không chỉ đổi số — nó đổi **câu hỏi đang hỏi**:
- **Hôm nay** = trực ca (Operator): chuyện đang xảy ra.
- **7 ngày** = nhịp tuần (trưởng nhóm): xu hướng ngắn hạn.
- **30 ngày / Quý** = chế độ lãnh đạo (Analyst): đánh giá hiệu quả & quyết định đầu tư.

⚙️ Đổi kỳ ở một chỗ đồng bộ **Tổng quan + Ticket + Báo cáo** để ba góc nhìn luôn nói về cùng khoảng thời gian.

---

## 7. Bản đồ liên kết giữa các tab

```
            ┌─────────────────── Bộ chọn KỲ (today/7d/30d/quarter) ───────────────────┐
            │  dùng chung; đổi 1 chỗ → đồng bộ nhãn + re-render                          │
            ▼                         ▼                              ▼
      [Tổng quan]                [Ticket]                        [Báo cáo]
       KPI/traffic/mix            KPI + widget scale               KPI/heatmap/access scale
            ▲                         ▲
            │ (ngữ nghĩa: cùng        │  (LIÊN KẾT CODE)
            │  câu chuyện cảnh báo)   │  "Tạo ticket": phiên → Ticket mới (source_conv_id)
            │                         │
      [Giám sát hội thoại] ──────────┘
       KPI phái sinh từ list; tiếp quản/flag/tạo-ticket

      [An tâm Gia đình]  — độc lập về code; liên kết ngữ nghĩa qua cảnh báo gian lận
```

**Liên kết bằng code (state thật):**
1. **Giám sát → Ticket:** "Tạo ticket" từ một phiên → ticket mới mang `source_conv_id`, hiện ngay ở Tab Ticket.
2. **Bộ chọn kỳ:** một input điều khiển 3 tab.
3. **KPI phái sinh:** KPI Giám sát tính từ list phiên đang lọc; KPI + 3 widget Ticket tính từ tập ticket đang lọc.

**Liên kết ngữ nghĩa (cùng kịch bản demo, không nối state):**
- Cảnh báo "lừa đảo/mất tiền" xuất hiện đồng bộ ở **Tổng quan** (alerts), **Giám sát** (phiên risk cao), **Gia đình**
  (nghi vấn lừa đảo của dependent) và **Thông báo** (chuông).
- Trục **trợ năng** lặp ở Tổng quan (nhanh) và Báo cáo (chi tiết + CSAT + sparkline).

---

## 8. Một câu chuyện vận hành xuyên các tab (ví dụ tổng hợp)

Theo dõi một sự cố gian lận điển hình để thấy các tab **ăn khớp**:

1. **Tổng quan** bật cảnh báo Cao: *"Tăng đột biến từ khoá lừa đảo, mất tiền"* → Admin biết có chuyện.
2. **Giám sát**: Operator lọc rủi ro "Cao", thấy phiên *"bị trừ 5 triệu không rõ"*, cảm xúc tiêu cực, Bot đã đánh dấu rủi ro
   và đang chuyển người → Operator **tiếp quản** + **tạo ticket**.
3. **Ticket**: ticket *"Xác minh giao dịch bất thường"* xuất hiện (truy vết về phiên gốc), ưu tiên Cao, đồng hồ SLA chạy →
   chuyên viên tạm khoá giao dịch, đối chiếu tín hiệu lừa đảo cộng đồng, mở tra soát.
4. **An tâm Gia đình**: nếu nạn nhân là người lớn tuổi có liên kết, con nhận cảnh báo "Nghi vấn lừa đảo" trong ~7s → cùng bảo vệ.
5. **Báo cáo**: cuối kỳ, vụ việc góp vào các chỉ số (chủ đề khiếu nại, SLA, CSAT) để quản lý thấy bức tranh lớn và cải tiến.

→ Vòng lặp **Phát hiện → Hiểu → Can thiệp → Theo dõi → Học**, mỗi tab phụ trách một chặng.

---

## 9. Phụ lục — tra cứu nhanh

### 9.1 Nguồn dữ liệu theo tab
| Tab | Endpoint | File seed | Live (Postgres)? | Bảng SQL chính |
|---|---|---|---|---|
| Tổng quan | `/dashboard/overview` | `overview.json` | ❌ snapshot | `analytics_snapshots` |
| Giám sát | `/dashboard/monitor` | `monitor.json` | ✅ một phần | `conversations`, `conversation_messages`, `escalations` (+KPI snapshot) |
| An tâm Gia đình | `/dashboard/family` | `family.json` | ❌ snapshot | `analytics_snapshots` |
| Ticket | `/dashboard/tickets` | `tickets.json` | ✅ một phần | `tickets`, `ticket_messages` (+filters/widgets snapshot) |
| Báo cáo | `/dashboard/reports` | `reports.json` | ❌ snapshot | `analytics_snapshots` |
| *Cài đặt* (ngoài phạm vi) | `/dashboard/settings` | `settings.json` | ✅ | `settings_security`, `settings_roles` |
| *meta dùng chung* | `/dashboard/config` | `config.json` | ❌ | — |
| *chuông thông báo* | `/dashboard/notifications` | `notifications.json` | ✅ | `notifications` |

### 9.2 Định danh thực thể (để dò liên kết)
phiên `C2505xx-xxxxxx` · ticket `TK-2025-#####` · escalation `ESC-####` · liên kết gia đình `FL-2025-####` · consent `CST-2025-####`.

### 9.3 Tab Cài đặt (tóm tắt)
Ngoài 5 tab nghiệp vụ, tab **Cài đặt** quản lý **phân quyền RBAC** (Admin/Operator/Analyst) và **bảo mật**
(Che PII, Audit log, Escalation tự động) — nền tảng tuân thủ QĐ2345/NĐ13. Có dữ liệu live từ DB khi chạy Postgres.

---

## 10. Phụ lục B — Từ điển trường dữ liệu (field → giao diện → ý nghĩa)

Phần này mổ xẻ **mọi trường** trong dữ liệu từng tab theo 3 cột:
- **Field** — tên trường trong JSON.
- **Thể hiện trên giao diện** — field đó **hiện ra cái gì** trên màn hình (con số trong thẻ? lát bánh tròn? độ dài thanh bar? màu badge?).
- **Ý nghĩa** — nó nói lên điều gì về nghiệp vụ.

Hai lưu ý đọc bảng:
- Các field `value` (và tương tự) là **chuỗi đã định dạng sẵn** (tiếng Việt, dấu phẩy thập phân) — console chỉ render, không tính lại.
- Field hậu tố `*Class` / `*Cls` / `color` / `dot` **không hiện chữ**, chỉ **quyết định màu** của badge/chấm/lát biểu đồ.

### 10.0 KPI card (thẻ chỉ số dùng chung mọi tab)
Mỗi thẻ KPI là một ô chữ nhật: góc trái có nhãn + số to + dòng delta; góc phải có icon tròn.
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `label` | Dòng chữ nhỏ phía trên cùng thẻ | Tên chỉ số |
| `value` | **Số lớn, in đậm** giữa thẻ | Giá trị chính (vd `112.300`, `77,1%`, `4,6/5`) |
| `delta` | Dòng nhỏ dưới số, kèm mũi tên ↑/↓ | Mức thay đổi so kỳ trước |
| `sub` | Chữ xám cạnh delta | Mốc so sánh ("so với tuần trước") |
| `dir` | **Tô màu** dòng delta: `up`→xanh, `down`→đỏ | Hướng tô màu (xem cảnh báo dưới) |
| `icon` | Icon SVG trong vòng tròn góc phải (emoji được đổi sang SVG) | Gợi hình chỉ số |
| `iconCls` | Đổi màu nền icon: `warning`→vàng, `danger`→đỏ | Nhấn mạnh chỉ số cần chú ý |

> ⚠️ `dir` chỉ là **màu**, không phải "tốt/xấu". KPI "Tỷ lệ chuyển tổng đài" để `dir:"down"` (mũi tên đỏ) nhưng **giảm là tốt** —
> phải đọc kèm `label` mới hiểu đúng.

### 10.1 Tab Tổng quan (`overview.json`)
**`byPeriod.{today|7d|30d|quarter}`** — đổi theo nút chọn kỳ:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `kpis[]` | Hàng **4 thẻ KPI** trên cùng | Nhịp tim hệ thống (§1.1) |
| `traffic.labels[]` | Nhãn dưới trục ngang biểu đồ đường | Mốc thời gian |
| `traffic.values[]` | **Điểm trên đường** + nhãn số phía trên mỗi điểm (hậu tố "K") | Số phiên mỗi mốc |
| `traffic.max` | (không hiện) trần để giãn chiều cao đường | Chuẩn hoá tỷ lệ vẽ |
| `requestMix[].label` | Tên + chấm màu trong **chú giải** cạnh bánh tròn | Nhóm yêu cầu |
| `requestMix[].pct` | **Độ lớn lát bánh tròn** + số % ở chú giải | Tỷ trọng intent |
| `requestMix[].color` | Màu lát bánh + chấm chú giải | Phân biệt nhóm |

**Cấp gốc:**
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `accessibility[].round` | Ký hiệu trong **vòng tròn nhỏ** đầu dòng (AA/🔊/▥) | Biểu tượng tính năng trợ năng |
| `accessibility[].label` | Tên tính năng cạnh vòng tròn | Chữ lớn / Đọc màn hình / Giọng nói |
| `accessibility[].value` | Số % in đậm | Tỷ lệ người dùng dùng |
| `accessibility[].delta` | Chữ xanh nhỏ bên phải dòng | Mức tăng |
| `escalationReasons[].label` | Nhãn bên trái mỗi **dòng thanh ngang** | Lý do chuyển người |
| `escalationReasons[].value` | Số in đậm cuối dòng | Số ca tuyệt đối |
| `escalationReasons[].pct` | **Độ dài thanh bar** (đã chuẩn hoá theo lý do cao nhất) | So sánh tương đối các lý do |
| `alerts[].time` | Cột "Thời gian" của **bảng cảnh báo** | Khi nào xảy ra |
| `alerts[].level` / `levelClass` | Cột "Mức độ": **badge** chữ + màu (`red/orange/blue`) | Cao/Trung bình/Thấp |
| `alerts[].type` | Cột "Loại cảnh báo" | Phân loại |
| `alerts[].content` | Cột "Nội dung" | Mô tả chi tiết |
| `alerts[].status` / `statusClass` | Cột "Trạng thái": **badge** + màu | Đang xử lý/Đang theo dõi/Đã xử lý |

### 10.2 Tab Giám sát hội thoại (`monitor.json`)
**`monitorKpis[]`** → hàng 4 thẻ KPI (§10.0). ⚠️ Trên UI **bị ghi đè** bằng KPI tính lại từ danh sách phiên (§2.1).

**`conversations[]`** — vừa là **một dòng trong bảng phiên**, vừa đổ vào **panel chi tiết** khi được chọn:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `id` | Dòng đầu ô đầu tiên (kèm chấm màu rủi ro) | Mã phiên |
| `time` | Chữ nhỏ dưới mã (bảng) + dòng meta panel | Giờ bắt đầu |
| `duration` | Dòng meta trong panel chi tiết | Thời lượng phiên |
| `customer` / `phone` | Cột "Khách hàng" (tên trên, SĐT dưới) | Ai đang gọi |
| `channel` | Luôn hiện **badge xanh "Bot"** (ép cứng) | Kênh đơn nhất |
| `status` | Cột "Trạng thái": **badge** màu theo `statusMeta` | Khúc nào của hành trình |
| `risk` | Cột "Mức rủi ro": **badge** + **chấm tròn** đầu dòng | Mức ưu tiên xử lý |
| `intent` | Cột "Ý định" + tiêu đề panel chat | Bot đoán khách muốn gì |
| `intentConf` | **Thanh tiến trình** "Độ tin cậy" trong panel chat | Bot chắc bao nhiêu % |
| `mood` | Nhãn trong ô "Cảm xúc khách hàng" (panel) | Cảm xúc tổng |
| `moodScore` | Chữ nhỏ "Điểm cảm xúc" trong ô đó | Điểm (âm=tiêu cực) |
| `moodPct` | **Thanh tiến trình** cảm xúc | Quy cảm xúc về thang % |
| `transcript[]` | **Khung chat** cuộn trong tab "Hội thoại" | Toàn bộ đối thoại |

**`transcript[]`** — mỗi câu là một **bong bóng chat**:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `who` | Quyết định **phía bong bóng + avatar** (`an`→phải "An", `kh`→trái "KH") | Ai nói |
| `name` / `time` | Dòng nhỏ trên bong bóng | Tên + giờ |
| `text` | Nội dung bong bóng | Lời thoại |
| `mood` / `moodCls` | **Badge cảm xúc** cuối bong bóng + màu (`green/gray/red`) | Cảm xúc câu đó |

**`escalations[]`** — mỗi mục là **một dòng bảng "Hàng đợi Escalations"**:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `code` | Cột "Mã" (`ESC-####`) | Định danh |
| `customer` | Cột "Khách hàng" (tên rút gọn) | Ai |
| `reason` | Cột "Nghiệp vụ · lý do" | Vì sao chuyển |
| `priority` / `priorityCls` | Cột "Ưu tiên": **badge** + màu | Độ gấp |
| `status` / `statusCls` | Cột "Trạng thái": **badge** + màu | Đang xử lý/Chờ tiếp nhận/Hoàn tất |
| `wait` | Cột "Chờ" (`m:ss` hoặc `—`) | Đã chờ bao lâu |

### 10.3 Tab An tâm Gia đình (`family.json`)
**`kpis[]`** → 4 thẻ KPI. **`filters[]`** → hàng **chip lọc** (`label` + số đếm in đậm); `key` quyết định chip nào đang chọn.

**`links[]`** — vừa là **dòng bảng liên kết**, vừa đổ vào **panel chi tiết**:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `id` | Cột "Mã liên kết" + tiêu đề panel | `FL-2025-####` |
| `guardian` / `guardianPhone` / `guardianRel` | Cột "Người trẻ (guardian)" (tên trên, quan hệ·SĐT dưới) | **Con** — người nhận cảnh báo |
| `dependent` / `dependentPhone` / `dependentRel` | Cột "Cha mẹ (dependent)" | **Cha mẹ** — chủ tài khoản |
| `status` | Cột "Trạng thái": **badge** màu + quyết định bộ nút ở panel | active/pending/revoked |
| `voiceOk` | **Badge "✓/○ Giọng nói"** ở cột Đồng thuận & panel | Cha mẹ đã đồng ý bằng giọng nói? (BR-FAM-01) |
| `ekycOk` | **Badge "✓/○ eKYC"** tương tự | Cha mẹ đã xác thực khuôn mặt? (BR-FAM-01) |
| `showBalance` | Cột "Số dư": badge **"Ẩn"** / **"Hiện (opt-in)"** + **toggle** trong panel | Con có xem số dư cha mẹ không (BR-FAM-05) |
| `createdAt` | Chữ nhỏ dưới mã liên kết | Lúc tạo yêu cầu |
| `grantedAt` | Dòng "Đồng ý lúc" trong panel (chỉ khi active) | Lúc cha mẹ đồng ý |
| `consentId` | Dòng "Bản ghi CONSENT" trong panel | Mã đồng thuận (`CST-####`) |
| `dependentGuardians` | Dòng "Guardian/dependent" dạng `n/4` | Số con giám hộ (trần 4 — BR-FAM-06) |
| `alerts7d` | Dòng "Cảnh báo 7 ngày" trong panel | Mức độ hoạt động liên kết |
| `revokedAt` | Dòng "Thu hồi lúc" (chỉ khi revoked) | Lúc cha mẹ rút liên kết (BR-FAM-04) |

**`alerts[]`** — mỗi dòng bảng "Cảnh báo gia đình gần đây":
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `time` | Cột "Thời gian" | Khi nào |
| `dependent` | Cột "Tài khoản cha mẹ" | Cảnh báo của ai |
| `type` | Cột "Loại cảnh báo" | Nghi vấn lừa đảo / GD lớn / Xu hướng vùng / OTP… |
| `level` / `levelClass` | Cột "Mức độ": **badge** + màu | Độ nghiêm trọng |
| `channels` | Cột "Đẩy tới" | Ai nhận (cha mẹ + n con — BR-FAM-07) |
| `latency` | Cột "Độ trễ" (vd "7,4s") | Tốc độ cứu hộ |
| `read` / `readClass` | Cột "Trạng thái đọc": **badge** + màu | Con đã đọc chưa |

### 10.4 Tab Ticket (`tickets.json`)
**`ticketFilters[]`** → hàng **chip lọc** (`label` + đếm). **`tickets[]`** — dòng bảng + panel chi tiết:
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `id` | Cột "Mã ticket" + tiêu đề panel | `TK-2025-#####` |
| `subject` | Cột "Chủ đề" + tiêu đề phụ panel | Vấn đề (thường = ý định phiên gốc) |
| `status` | Cột "Trạng thái": **badge** màu theo `ticketStatusMeta` | new/processing/waiting/closed |
| `customer` / `phone` | Cột "Khách hàng" | Ai |
| `channel` | Cột "Kênh": **badge xanh** | Nơi tiếp nhận |
| `priority` / `priorityCls` | Cột "Mức ưu tiên": **badge** + màu | Độ gấp (đầu vào sắp xếp) |
| `sla` | Cột "SLA" dòng trên | Thời gian SLA |
| `slaNote` | Cột "SLA" dòng dưới, **tô màu** theo `slaCls` ("Quá hạn"/"Còn 25m") | Cảnh báo hạn |
| `slaCls` | Màu chữ slaNote + đầu vào widget SLA (`red`=quá hạn) | Đúng/sắp/quá hạn |
| `assignee` | Cột "Người phụ trách" | Ai xử lý |
| `createdAt` | Dòng meta panel | Lúc tạo |
| `aiSummary` | Đoạn văn trong ô **"Tóm tắt AI"** (tab Tóm tắt) | An tóm tắt vụ việc |
| `aiConf` | Chữ nhỏ "Độ tin cậy" dưới tóm tắt | Mức tin cậy tóm tắt |
| `slaDetail.state` | Chữ đậm trong ô SLA panel (đỏ nếu "Quá…") | Diễn giải trạng thái |
| `slaDetail.total` | Số bên phải ô SLA | Quỹ thời gian |
| `slaDetail.pct` | **Độ dài + màu thanh SLA** (≥80% chuyển cam→đỏ) | % thời gian đã trôi |
| `slaDetail.deadline` | Chữ nhỏ "Hạn SLA" | Hạn chót |
| `actions[]` | Danh sách **"✓ ..."** trong ô "Đề xuất hành động" | Các bước An gợi ý xử lý |

**`ticketWidgets`** (3 ô đáy trang; ⚠️ UI **tính lại từ tập ticket đang lọc** — giá trị trong file chỉ là seed):
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `byChannel.donut` / `.total` | **Bánh tròn** "Phân bổ theo kênh" + số tổng giữa tâm | Việc đến từ kênh nào |
| `slaPerf.donut` / `.total` | **Bánh tròn** "Hiệu suất SLA" (đúng/quá hạn) | % giữ cam kết |
| `topTopics[].label` | Nhãn dòng trong "Top chủ đề" | Chủ đề lặp nhiều |
| `topTopics[].value` | Số cuối dòng | Số ca |
| `topTopics[].pct` | **Độ dài thanh bar** | So sánh tương đối |

**`ticketThreads`** = map `{ "<mã ticket>": [...] }` → đổ vào tab **"Trao đổi"** dạng bong bóng chat;
mỗi tin: `who` (`kh`/`nv`) quyết định phía+avatar, `name`+`time` ở trên, `text` là nội dung
(tên có thể là "An (Bot)", "Engine Dự báo", hoặc tên chuyên viên). Số tin hiện kèm nhãn tab "Trao đổi N".

### 10.5 Tab Báo cáo (`reports.json`)
**`byPeriod.{kỳ}`:**
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `kpis[]` | Hàng 4 thẻ KPI tăng trưởng | Sức khoẻ kinh doanh |
| `userSession.labels[]` | Trục ngang biểu đồ đường đôi | Mốc thời gian |
| `userSession.users[]` | **Đường xanh** "Người dùng" | Số người |
| `userSession.sessions[]` | **Đường xanh dương** "Phiên tương tác" | Số lượt |
| `userSession.max` | (không hiện) trần trục Y | Chuẩn hoá vẽ |
| `channelUsage.labels[]` | Trục ngang biểu đồ cột | Mốc thời gian |
| `channelUsage.series[][]` | **Các cột** — UI **cộng dồn mọi kênh thành 1 cột "Bot"** mỗi mốc | Lưu lượng Bot |
| `channelUsage.colors[]`/`legend[]` | (UI gộp nên chỉ chú giải "Bot (tổng phiên)") | Tên kênh gốc trong data |

**Cấp gốc:**
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `intentHeatmap.cols[]` | **Tiêu đề cột** bảng nhiệt (thời gian + "Tổng") | Trục thời gian |
| `intentHeatmap.rows[].name` | Cột đầu mỗi hàng | Tên intent (Top 5) |
| `intentHeatmap.rows[].values[]` | **Các ô số** trong hàng | Số lượt theo mốc |
| `intentHeatmap.rows[].total` | Ô "Tổng" cuối hàng | Tổng hàng |
| `accessEffect[].feature` | Cột "Tính năng trợ năng" | Tên tính năng |
| `accessEffect[].users` | Cột "Người dùng" | Số người (scale theo kỳ) |
| `accessEffect[].rate` | Cột "Tỷ lệ sử dụng" | % dùng |
| `accessEffect[].csat` | Cột "Hài lòng" | CSAT riêng (x/5) |
| `accessEffect[].spark[]` | **Đường sparkline** cột "Xu hướng" | Diễn biến gần đây |
| `insights[].icon`/`title`/`text` | **Thẻ insight** (icon + tiêu đề đậm + đoạn mô tả) | Nhận định cho quản lý |
| `targetKpis[].metric` | Nhãn trái mỗi dòng mục tiêu | Tên chỉ tiêu pilot |
| `targetKpis[].target` | Cột giữa | Ngưỡng cam kết ("≥ 60%") |
| `targetKpis[].actual` | Số đậm (xanh nếu đạt) | Thực tế |
| `targetKpis[].ok` | **Badge "Đạt"/"Chưa đạt"** | Có đạt cam kết không |

### 10.6 Meta dùng chung (`config.json`) — không tự hiện, chi phối cách hiển thị nơi khác
| Field | Thể hiện trên giao diện | Ý nghĩa |
|---|---|---|
| `periods[]` | Nội dung **menu chọn kỳ** (nhãn nút daterange) | today/7d/30d/quarter |
| `channelMeta{}` | Quyết định nhãn badge kênh = **"Bot"** | Quy ước kênh đơn |
| `statusMeta{}` | Nhãn + màu **badge trạng thái phiên** (Giám sát) | bot/verify/escalated/takenover |
| `riskMeta{}` | Nhãn + màu **badge & chấm rủi ro** (Giám sát) | low/medium/high |
| `ticketStatusMeta{}` | Nhãn + màu **badge trạng thái ticket** | new/processing/waiting/closed |
| `historyTemplate[]` | Nội dung **timeline** tab "Lịch sử" (Giám sát & Ticket) | Lịch sử tương tác mẫu |

### 10.7 Cài đặt & Thông báo
**`settings.json`** — `roles[]` (`name/desc/state/cls/on`) → mỗi dòng có tên + mô tả + **badge trạng thái** + **toggle** bật/tắt vai trò RBAC;
`security[]` (`name/desc/on`) → tên + mô tả + **toggle** (Che PII / Audit log / Escalation tự động).
**`notifications.json`** — `notifications[]` (`icon/title/time/text`) → danh sách trong **popup chuông** góc phải mọi tab;
số lượng hiện thành **chấm đỏ đếm** trên biểu tượng chuông.
