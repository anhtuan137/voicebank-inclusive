# CLAUDE.md — Context để code tiếp (ĐỌC FILE NÀY TRƯỚC)

> Mục đích: mỗi lần mở lại dự án, **chỉ cần đọc file này** là đủ context để code tiếp,
> không phải quét lại toàn bộ repo. File này là bản tóm tắt + bản đồ; **nguồn chân lý
> chi tiết** vẫn là [VoiceBank_Inclusive_BUILD_SPEC.md](VoiceBank_Inclusive_BUILD_SPEC.md).
>
> ⚠️ **Quy tắc cập nhật:** sau mỗi phiên làm việc có thay đổi đáng kể (xong 1 phase, đổi
> kiến trúc, thêm route/endpoint, đổi lệnh chạy), hãy cập nhật mục **"Trạng thái hiện tại"**
> và **"Nhật ký phiên"** ở cuối file. Giữ file này ngắn gọn và đúng thực tế.

---

## 1. Dự án là gì

**VoiceBank Inclusive** — trợ lý tài chính AI **hội thoại đa phương thức** (giọng nói + chat +
thẻ trực quan) nhúng trong **VCB Digibank**, hướng Gen Z. Hai trụ cột: **"Dự báo"** (predictive)
và **"Thấu hiểu"** (empathetic). Toàn bộ năng lực AI chạy trên hệ sinh thái **VNPT** (SmartVoice,
Smartbot, eKYC, vnFace, SmartReader, vnSocial, SmartUX).

- Đội **DATAXTRA** · Vietnamese Student HackAIthon 2026 (Bảng B).
- Mọi số liệu hiện tại là **dữ liệu mô phỏng** phục vụ demo.

## 2. Tech stack (đã cố định — xem §5 spec)

| Lớp | Công nghệ |
|---|---|
| Orchestrator (`voice2text`) | Python ≥3.11, FastAPI, Pipecat (Phase 2+), uvicorn — cổng **:18889** |
| Mock Bank Core (`mockapi`) | FastAPI, Postgres/JSON — cổng **:18890** |
| Frontend (`application/frontend`) | Next.js 15.3, React 19, TypeScript — cổng **:18891** |
| Hạ tầng | Docker Compose (postgres + minio + mockapi) |
| Quản lý deps Python | **uv** (không phải pip thuần) |

## 3. Bản đồ thư mục (chỗ nào làm gì)

```
voicebank-inclusive/
├── voice2text/            # Orchestrator — :18889
│   ├── server.py          # FastAPI app: /health, /info (WS /ws/bot → Phase 2+)
│   ├── config.py          # .env + hằng số nghiệp vụ (§7/§16)
│   └── tests/
├── mockapi/               # Mock lõi ngân hàng — :18890
│   ├── server.py          # /health + include routers
│   ├── routers/dashboard.py
│   ├── database.py
│   └── tests/
├── application/frontend/   # Next.js 15 (Phase 6 — ĐANG LÀM)
│   ├── app/user/page.tsx  # Shell điện thoại, route giữa các "screen"
│   ├── components/screens/ # 1 file / 1 luồng (Home, Assistant, BillPay, Family…)
│   ├── components/         # chrome, primitives, Icon, AssistantBits, CityHero
│   ├── lib/types.ts        # type Screen + model dữ liệu (amount = int VND)
│   ├── lib/mock.ts         # dữ liệu mock cho UI
│   ├── certificates/       # cert self-signed cho dev:mobile (camera eKYC)
│   └── legacy-dashboard/   # dashboard tĩnh cũ → sẽ port sang /admin, /user-management
├── db/                     # schema.sql + seed.py
├── docker/                 # Dockerfile.python + compose (infra / app)
├── .env / .env.example     # khóa VNPT; đặt *_PROVIDER=smoke để chạy offline
├── Makefile                # mọi entrypoint dev (xem mục 5)
└── VoiceBank_Inclusive_BUILD_SPEC.md   # ĐẶC TẢ ĐẦY ĐỦ (single source of truth)
```

## 4. Đặc tả — tra cứu nhanh theo mục (file BUILD_SPEC)

| Cần gì | Mục |
|---|---|
| Nguyên tắc kiến trúc & quy ước agent (**đọc trước khi code**) | §3 |
| Kiến trúc tổng thể | §4 |
| Cấu trúc thư mục | §6 |
| **Quy tắc nghiệp vụ (giá trị phải khớp CHÍNH XÁC)** | §7 (auth 7.1, transfer 7.2, savings 7.3, family 7.5) |
| Hợp đồng WebSocket & REST | §9 (WS 9.1, voice2text REST 9.2, mockapi ~47 route 9.3) |
| Mô hình dữ liệu | §10 |
| Adapter API VNPT (stt/tts/nlu/ekyc/vnsocial/smartux) | §11 |
| Engine Dự báo & Thấu hiểu | §12 (family_service 12.3) |
| Luồng hội thoại (intents/flows) | §13 |
| Admin/Operator | §14 |
| Bảo mật & tuân thủ (QĐ2345/NĐ13, RBAC, PII) | §15 |
| Biến môi trường | §16 |
| Build/chạy/test/deploy | §17 |
| **Kế hoạch phase + tiêu chí nghiệm thu** | §18 |
| Definition of Done | §19 |

## 5. Lệnh hay dùng

```bash
# --- Python (từ gốc repo) ---
make install          # tạo .venv (uv) + cài deps
make demo             # mockapi :18890 + frontend :18891 cùng lúc (Ctrl+C tắt cả hai)
make run-mockapi      # :18890
make run-voice2text   # :18889
make test             # pytest -p no:asyncio
make lint             # ruff
make infra-up         # postgres + minio + mockapi (Docker)
make compose-config   # validate compose

# --- Frontend (cd application/frontend) ---
npm install
npm run dev           # http://localhost:18891/user  (HTTP, máy tính)
npm run dev:mobile    # HTTPS + bind LAN → test camera eKYC trên điện thoại
npm run build
npm run typecheck

# health check
curl http://localhost:18889/health   # voice2text
curl http://localhost:18890/health   # mockapi
```

**Test camera trên điện thoại:** phải HTTPS (`npm run dev:mobile`), điện thoại cùng WiFi,
mở `https://<IP-máy>:18891/user`, bỏ qua cảnh báo cert. Đổi WiFi/IP → tạo lại cert + cập nhật
`allowedDevOrigins` trong `next.config.ts` (chi tiết trong [README.md](README.md)).

## 6. Quy ước & "luật" phải nhớ

- **Tiền tệ:** luôn là **int VND**, KHÔNG dùng float. (`amount` âm = chi ra).
- **Giá trị nghiệp vụ §7 là AUTHORITATIVE** — hạn mức, ngưỡng, bước xác thực phải khớp đúng
  spec, không tự bịa.
- **VNPT-only:** mọi AI đi qua adapter VNPT (§11). Chạy offline bằng `*_PROVIDER=smoke`.
- **TCBS deprecated** (lưu ý chung hệ sinh thái) — không dùng.
- Frontend: mỗi luồng = 1 file trong `components/screens/`, điều hướng qua `Screen` type
  trong `lib/types.ts` và hàm `go(screen)` ở `app/user/page.tsx`.
- Bám sát kế hoạch phase §18; cập nhật bảng trạng thái ở [README.md](README.md) khi xong phase.

## 7. Trạng thái hiện tại (cập nhật mỗi phiên)

> Cập nhật lần cuối: **2026-06-26**

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Scaffold (repo, Docker, .env, Makefile, CI, health) | ✅ Done |
| 1 | Mock Bank Core + quy tắc §7 | ✅ **Done** — 39 route nghiệp vụ (§9.3) + toàn bộ §7 (rules.py) + 40 unit test (BR-AUTH/TRF/SAV/AGT) pass; dual-backend JSON/Postgres (fallback). FE đã nối **số dư (đọc)** + **chuyển tiền (ghi, verify→eKYC→execute)**. |
| 2 | Orchestrator skeleton + WebSocket + verification | ⏳ (mới có `/health`, `/info`) |
| 3 | Adapter VNPT + audio profiles | ⏳ |
| 4 | FlowManager + 11 luồng lõi | ⏳ |
| 5 | Engine Dự báo & luồng Gen Z | ⏳ (backend chưa; **4 flow Gen Z đã hội thoại hoá ở FE** — spending/forecast/savings_goal/fraud trong chat Trợ lý An) |
| 6 | Frontend Next.js | 🟢 **Gần xong** — `/user` shell + 13 screen (các flow chính **đã nối mockapi**: chuyển tiền, tiết kiệm, hoá đơn, khoá thẻ/dịch vụ); `/admin` **6 tab React** (Tổng quan/Giám sát/Gia đình/Ticket/Báo cáo/Cài đặt) đọc `/api/v1/dashboard/*`; `/user-management` (hiệu suất + escalation + chỉ số gia đình). Còn lại **D. voice call thật** (`lib/voiceCall.ts`) — **chặn** vì cần Phase 2/3 (WS `/ws/bot`). |
| 7 | Bảo mật & tuân thủ | ⏳ |
| 8 | Test, WER, CI/CD, deploy | ⏳ |

**Backend:** `mockapi` đã có **lõi nghiệp vụ Phase 1** (auth/card/service/transfer/savings/
transactions/customers/kyc/misc — `mockapi/rules.py` + `store.py` + `routers/*`); `voice2text`
vẫn là skeleton (`/health`, `/info`; WS `/ws/bot`, adapter VNPT, flows **chưa làm**). Lưu ý:
lõi mockapi dùng **store in-memory** seed từ `db/database.json` + `db/savings_data.json`
(mutation chạy trong RAM, `reset()` về seed); chế độ `DB_SOURCE=postgres` seed/nạp bảng
`bank_customers`, lỗi → fallback JSON. **Frontend đã bắt đầu nối mockapi** (Phase 6): `lib/api.ts`
có client gõ kiểu `bankApi`; `lib/LiveData.tsx` nạp hồ sơ → Trang chủ hiện **số dư trực tiếp**
(badge "Trực tiếp"), Trợ lý An **chuyển tiền ghi thật** (verify→eKYC nếu >10tr→execute, làm mới
số dư). Các luồng khác (tiết kiệm/hoá đơn/khoá thẻ…) vẫn local — nối tiếp theo cùng pattern.
**Lưu ý dual-backend:** store chỉ seed Postgres `bank_customers` khi bảng RỖNG → đổi
`db/database.json` xong phải `DELETE FROM bank_customers` (hoặc chạy lại `db/seed.py`) để nạp lại.

**Việc tiếp theo gợi ý:** Phase 2 (WebSocket `/ws/bot` ở voice2text) — mở khoá mảng D Phase 6
(`lib/voiceCall.ts` voicebot thật từ browser, hiện đang chặn). Hoặc Phase 3 (adapter VNPT).

## 8. Nhật ký phiên (mới nhất ở trên)

- **2026-06-26** — **Làm nốt Phase 6 (mảng A+B+C; D bị chặn).** (A) Nối nốt các flow `/user` vào
  mockapi theo pattern `syncTransferToBackend`: **tiết kiệm** (`syncSavingsToBackend`→`/savings/open`,
  BR-SAV-06 trừ gốc), **hoá đơn** (`syncBillpayToBackend`→endpoint MỚI `POST /vcb-pay/bill-payment`
  trừ tài khoản + ghi giao dịch `bill_payment`), **khoá thẻ/dịch vụ** (`syncSecureToBackend`→
  `/card/lock` | `/service/lock`; thêm `kind` vào `SecureOp` + `backendServiceName()` map nhãn FE→
  "SMS/Internet Banking", nhãn ngoài map (vd "Rút tiền ATM") bỏ qua sync), khoá thẻ do gian lận
  (`onFraudLocked`→`/card/lock`). `bankApi` thêm `serviceLock/billPay`. (B) **`/admin` port đủ 6
  tab React** (trước chỉ có Family): `OverviewAdmin/MonitorAdmin/TicketsAdmin/ReportsAdmin/
  SettingsAdmin` đọc `lib/dashboardApi.ts` (client mới gõ kiểu, fetch `/api/v1/dashboard/*`, offline→
  thẻ "mất kết nối"); Ticket tiếp nhận/hoàn tất qua PATCH (fallback cục bộ nếu json), Settings toggle
  bảo mật. Helper chung `app/admin/parts.tsx` (`useAsync/KpiGrid/OfflineCard`); gỡ Placeholder; CSS
  thêm bars/insight/transcript. (C) **`/user-management` mới** (tái dùng admin.css): hiệu suất KPI +
  hàng đợi escalation (tiếp nhận→handling→done, state cục bộ) + chỉ số "An tâm Gia đình" + cảnh báo.
  Backend: `mockapi/routers/misc.py` +endpoint bill-payment (+import `date`,`HTTPException`); 2 test
  mới (`test_bill_payment_*`). **D (voice call thật) CHƯA làm — chặn bởi Phase 2/3** (chưa có WS).
  **Verify:** FE typecheck + `next build` pass (3 route /user /admin /user-management), backend **42
  test pass**, ruff sạch; smoke live: bill-payment trừ 14.65tr→14.3tr, 5 endpoint dashboard trả đúng
  shape, ticket PATCH 200. **Lưu ý:** /admin & /user-management đọc dashboard endpoint — Monitor/
  Tickets/Settings cần `DB_SOURCE=postgres` để có dữ liệu live (json mode trả snapshot tĩnh, write→503
  nên FE fallback cục bộ).

- **2026-06-24** — **Fix lịch sử hiện sai người nhận khi chuyển theo tên.** Chuyển "theo tên"
  → STK bị che (4 số) → FE gửi STK dự phòng `0011000999888` (của Nguyễn Văn Bình trong seed) →
  backend tra ngược tên từ STK đó → ghi sai. Sửa: `ExecuteBody.recipient_name` (tùy chọn);
  execute ưu tiên tên FE truyền rồi mới `_lookup_name` (BR-TRF-06 giữ cho chuyển theo STK).
  `bankApi.transferExecute` + `syncTransferToBackend` truyền `recipient_name: d.recipient`.
  Smoke: execute với recipient_name='Đỗ Anh Tuấn' → desc "Chuyen tien Đỗ Anh Tuấn". 40 test pass.
- **2026-06-24** — **Fix bong bóng chat gửi thiếu chữ khi gõ tiếng Việt.** `onKeyDown` Enter ở
  ô chat (`Assistant.tsx`) gửi `input` ngay cả khi IME còn đang ghép âm tiết → bong bóng hiển
  thị sai/thiếu chữ vừa gõ. Sửa: chỉ gửi khi `!e.nativeEvent.isComposing && e.keyCode !== 229`.
- **2026-06-24** — **Nối "xem số dư" trong chat vào mockapi.** `showBalance` + `BalanceCard`
  trước đọc `user.balance`/`transactions` tĩnh → sai số dư & lịch sử sau khi chuyển tiền. Sửa:
  dùng `useLiveData()` — số dư từ `profile.account_balance`, 4 giao dịch gần đây map từ
  `transactions` thật (BankTxn→{label,date,amount}); `showBalance` gọi `refresh()` để kéo dữ
  liệu mới nhất (thẻ tự cập nhật khi context đổi). Offline → fallback mock. FE typecheck pass.
- **2026-06-24** — **Sửa flow "Chuyển tiền" từ Bot.** Trước: Home robot widget / favorites →
  `go("transfer")` mở màn `Transfer.tsx` **tĩnh** pre-fill sẵn người nhận "Nguyễn Minh Anh"
  (nhảy thẳng màn xác nhận, sai flow). Sửa: các điểm vào "Chuyển tiền" nay mở **Trợ lý An** vào
  luồng hội thoại (hỏi người nhận → số tiền → nội dung → xác nhận → quét mặt → execute thật).
  Mở rộng `Assistant.launch` thêm `"transfer"` (effect mount gọi `startTransfer()`), `page.tsx`
  thêm `goTransfer()` (set launch + go assistant) truyền xuống `Home` qua prop `onTransfer`;
  `Home.transfer()` đóng widget rồi gọi onTransfer (fallback `go("transfer")`). Màn `Transfer.tsx`
  tĩnh giờ orphaned (giữ lại, không vào từ Bot). FE typecheck pass.
- **2026-06-24** — **Nối màn Lịch sử giao dịch vào mockapi.** Trước đó chuyển tiền đã ghi vào
  store backend nhưng `History.tsx` vẫn đọc `mock.ts` → không thấy giao dịch mới. Sửa:
  `LiveData` context nạp thêm `transactions` (refresh sau mỗi lần chuyển tiền), `bankApi.
  getTransactions()`; `History.tsx` map `BankTxn`→`Txn` (icon = chữ đầu desc, màu theo nhóm
  `CAT_COLOR`, ngày YYYY-MM-DD→dd/mm/yyyy) và tính tổng chi/thu từ list thật; offline → mock.
  Smoke: execute 2tr → `/transactions` tăng từ 4→5, mới nhất "Chuyen tien …" -2.000.000. FE
  typecheck pass.
- **2026-06-24** — **Nối Frontend ↔ Mock Bank Core (Phase 6, lát cắt dọc đầu tiên).**
  `lib/api.ts` mở rộng thành client gõ kiểu `bankApi` (getProfile, verifyPin/sendOtp/verifyOtp,
  kycVerify, transferVerify/Execute, savingsCalculate/Open, cardLock/Unlock) + `ApiError` +
  `DEMO_PHONE=0790123456`; giữ `recordUserAction`. `lib/LiveData.tsx` — context nạp hồ sơ khi mở
  app, `refresh()` sau ghi; offline → `connected=false`, UI fallback mock. `app/user/page.tsx`
  bọc `<LiveDataProvider>` (tách `UserShell`). **Home**: số dư + STK lấy từ `profile` (badge
  "● Trực tiếp" khi nối được). **Assistant**: `onAuthed` cho luồng "Chuyển tiền" gọi
  `syncTransferToBackend` (verify → kycVerify nếu pending_kyc → execute idempotent) rồi
  `refresh()` để số dư Trang chủ trừ thật theo §7. Backend: `kyc/biometric/verify` nay đánh dấu
  `transfer_challenges[challenge_id].verified=True` khi đạt → đóng vòng eKYC>10tr cho execute.
  Seed `db/database.json` chỉnh khách hàng demo về **Đỗ Anh Tuấn / 1036350085 / 14.65tr** cho
  khớp UI; cập nhật assertion test theo số dư mới + đổi case "large transfer" sang 12tr (>10tr
  nhưng ≤ số dư). Dọn `bank_customers` cũ (28.5tr) để reseed. **Test 40 pass, ruff sạch, FE
  typecheck pass**; đã smoke loop profile→verify→kyc→execute (số dư 14.65tr→2.65tr).
- **2026-06-24** — **Hoàn thiện Phase 1 — Mock Bank Core (`mockapi`).** Thêm: seed
  `db/database.json` (3 customer, 5 bank, beneficiaries/contacts/transactions) +
  `db/savings_data.json` (biểu lãi suất 1–36 tháng + sổ seed); `mockapi/rules.py` — toàn bộ
  hằng số §7 + hàm thuần (validate_transfer, requires_face_kyc, simple_interest,
  validate_savings_open, should_lock_pin/otp, normalize_service_name, kyc_passed…);
  `mockapi/store.py` — store in-memory seed từ JSON, `resolve_phone_key` (khớp 4 số cuối),
  hạn mức ngày, challenge/idempotency chuyển tiền, dual-backend (postgres seed bảng
  `bank_customers`, lỗi→fallback JSON); `api_common.py` (customer_or_404, require_demo,
  public_customer che PIN/PII). **39 route** (§9.3): auth (verify-pin/send-otp/verify-otp/
  reset-attempts + internal latest-otp DEMO), accounts (customers, card lock/unlock/temp-lock,
  service lock/unlock + BR-SVC-01, transactions, kyc 2 bước), transfer (banks/lookup/verify/
  execute/bank-transfer/parse-qr — BR-TRF-01..09 + eKYC>10tr + idempotent), savings (rates/
  calculate/list/open/freeze/unfreeze — BR-SAV-01..08), misc (branch, vcb-pay, callback BR-AGT,
  beneficiaries/contacts, demo-reset & activate-all sau FEATURE_DEMO). **Test: 40 pass**
  (`test_rules.py` phủ từng BR-AUTH/TRF/SAV/AGT/SVC/KYC + `test_bank_api.py` integration), ruff
  sạch (thêm per-file-ignore E402 cho server.py — load_dotenv-first; bỏ import `timezone` thừa
  ở dashboard.py). **Lưu ý:** mutation in-memory (mock core demo); FE CHƯA nối mockapi (Phase 6).
- **2026-06-19** — **Hội thoại hoá "An tâm Gia đình" (§7.5/§13)** trong chat Trợ lý An
  (`Assistant.tsx`) — bổ sung cho màn riêng `screens/Family.tsx` vốn đã có. `startFamily()` mở
  tổng quan người thân + menu 3 nhánh chạy in-chat: (1) **family_link_flow** — slot-fill quan
  hệ → SĐT → thẻ xác nhận giải thích "nguyên tắc một trục" → gửi yêu cầu → thẻ **chờ** → tự
  kích hoạt sau ~2s (mô phỏng người thân đồng ý giọng nói + eKYC trên máy họ) → thẻ
  **kích hoạt** (BR-FAM-01); (2)
  **family_alert_flow / parent_action_result** — thẻ cảnh báo & kết quả (chỉ-đọc); (3)
  **family_summary_flow** — tóm tắt chi tiêu người thân, KHÔNG lộ số dư/PIN/OTP (BR-FAM-05).
  Bám bất biến BR-FAM-02: người trẻ chỉ NHẬN, không có hành động giao dịch trên tài khoản người
  thân. Thêm step `fam_menu/fam_relation/fam_phone/fam_confirm/fam_pending`; card union mở rộng
  (`familyOverview/familyLinkConfirm/familyPending/familyActive/familyAlerts/familySummary`);
  `routeIntent` nhận "an tâm gia đình/liên kết cho mẹ-bố/người thân…"; mic mô phỏng + quick
  replies từng bước; `recordUserAction` ghi liên kết (Chờ đồng ý → Đã kích hoạt) cho console
  admin. Tái dùng `familyMembers/familyAlerts` (`lib/mock.ts`). Typecheck pass.
- **2026-06-19** — **Code lại Bước 4 luồng Tạo mới/Đổi mã PIN thẻ** (`Assistant.tsx`) cho khớp
  đúng hướng dẫn VCB Digibank. Luồng `card_pin` (B1 menu Quản lý DV Thẻ→DV Thẻ khác→Tạo mới/Đổi
  mã PIN → B2 chọn loại thẻ → B3 nhập+xác nhận PIN 6 số → B4 xác nhận → B5 thành công) vốn đã
  có; phần thiếu là **"Chọn phương thức xác thực"** ở màn xác nhận (trước hardcode `SMS OTP`).
  Thay đổi: `PinConfirmCard` thêm bộ chọn radio **Smart OTP / SMS OTP** (mặc định SMS OTP) hiện
  khi `active`; `onPinConfirm(method)` nhận phương thức đã chọn → câu hướng dẫn OTP đổi theo
  (Smart OTP: "mở app lấy mã"; SMS OTP: "đã gửi tới ••• 079"). Lưu `authMethod` vào `Draft` +
  ghi vào `recordUserAction` (hiện ở console admin). Typecheck pass.
- **2026-06-19** — **Tổng quan cộng dồn realtime + mirror legacy.** (a) `GET /api/v1/dashboard/
  overview` nay đính kèm `liveKpis` tính trực tiếp từ DB (tổng phiên hội thoại / phiên chuyển
  tổng đài / ticket đang mở) khi `db_source=postgres`; console `/dashboard` render thành dải
  **"⚡ Trực tiếp"** phía trên KPI mock (`#ov-live-wrap`, ẩn khi không có liveKpis) — bump
  `app.js?v=20260619-live`. (b) Mirror 2 chỉnh sửa này sang `legacy-dashboard/` cho khớp cấu
  trúc — LƯU Ý: `legacy-dashboard` đọc **`data/*.json` tĩnh, KHÔNG nối mockapi**, đã chệch
  nhiều so với `public/dashboard` (~928 dòng app.js) → là bản **cũ/độc lập**, dải live luôn ẩn
  ở đó. Bản phục vụ thật là `public/dashboard`. Test: overview trả liveKpis đúng; node --check
  cả hai app.js OK; dữ liệu DB về trạng thái seed (8 hội thoại / 7 ticket).
- **2026-06-19** — **Đồng bộ thao tác /user → các tab admin SẴN CÓ** (không tạo tab riêng).
  Mỗi thao tác hoàn tất trên Trợ lý An được ghi thẳng vào bảng mà console `/dashboard` đang đọc:
  (1) backend `mockapi/routers/activity.py` — `POST /api/v1/dashboard/user-action` insert vào
  `conversations`+`conversation_messages` (→ tab **Giám sát hội thoại**, kèm transcript/intent/
  risk/mood); với `kind="support"|"fraud"` tạo thêm `tickets`(+`ticket_messages`) + `escalations`
  (→ tab **Ticket hỗ trợ** + hàng đợi). YÊU CẦU `DB_SOURCE=postgres` (các tab này đọc trực tiếp
  Postgres); chế độ json trả `{stored:false}` để FE bỏ qua. id dùng hậu tố ngẫu nhiên `_rid()`
  (tránh trùng khoá khi nhiều thao tác cùng giây). (2) FE `lib/api.ts` → `recordUserAction()`
  POST mockapi (fire-and-forget, `NEXT_PUBLIC_MOCKAPI_URL` mặc định :18890); `Assistant.tsx` gọi
  ở mọi điểm hoàn tất với `kind` phù hợp (transaction: chuyển tiền/tiết kiệm/hoá đơn/mục tiêu;
  support: khoá thẻ/dịch vụ, ATM nuốt thẻ, gọi lại, tổng đài; fraud: xử lý cảnh báo/khoá thẻ).
  **Đã gỡ** tab "Hoạt động khách hàng" + activity-log file (hướng cũ). **Test:** 3 loại POST →
  hiện đúng trong /monitor & /tickets; ruff + py_compile + FE typecheck pass; đã dọn dữ liệu test
  về trạng thái seed (8 hội thoại / 7 ticket). **Lưu ý:** Tổng quan (KPIs) vẫn là snapshot tĩnh
  (chưa cộng dồn realtime); cần Postgres chạy (mockapi `db_source=postgres`).
- **2026-06-19** — **Hoàn thiện mô phỏng Nhóm 1 (Kế thừa, §13)** trong chat Trợ lý An
  (`Assistant.tsx`): ngoài 3 luồng cũ (chuyển tiền/tiết kiệm/hoá đơn), thêm — `transaction`
  (thẻ **số dư + lịch sử** giao dịch), `card_lock` (khoá thẻ → xác nhận → **quét mặt** → xong),
  `service_lock` (chọn dịch vụ NH điện tử/thanh toán online/rút ATM → quét mặt), `card_swallowed`
  (báo ATM nuốt thẻ → **phiếu sự cố**), `callback` (đặt lịch gọi lại → phiếu), `transfer`
  (chuyển **tổng đài viên** → phiếu hàng chờ), `guidance` (how-to: đổi PIN/hạn mức/QR/mở thẻ).
  Cơ chế chung mới: `SecureOp` (xác nhận→quét mặt→xong) cho card_lock/service_lock; `Ticket`
  cho 3 luồng tạo phiếu; helper `matchService/ticketCode/guidanceAnswer`; `routeIntent` mở rộng
  (đặt cụm cụ thể trước cụm chung, how-to kiểm tra cuối). Bước mới `sl_pick/cb_time/cs_loc/
  sec_confirm/sec_auth`; card mới `balance/secureConfirm/secureAuth/secureDone/ticket`; mic mô
  phỏng + quick replies cho từng bước; `more` quick replies đổi thành Xem số dư/Khoá thẻ/Không.
  Typecheck pass. Còn `greeting/route_to_intent` (định danh) coi như đã có qua WELCOME + nhận
  diện ý định — app vốn đã "đăng nhập" sẵn (Anh Tuấn).
- **2026-06-19** — **Hội thoại hoá Nhóm 2 (Gen Z / Dự báo, §13)** trong chat Trợ lý An
  (`components/screens/Assistant.tsx`): thêm 4 flow chạy ngay trong khung chat —
  `spending_insight` (thẻ Donut chi tiêu theo danh mục), `cashflow_forecast` (Sparkline +
  callout "cháy túi"), `savings_goal` (slot-filling tên→mục tiêu→gửi góp/tháng → thẻ xác nhận →
  thẻ gamification Ring+badge, KHÔNG cần eKYC vì là thiết lập gửi góp), `fraud_alert` (thẻ giao
  dịch ngờ + 2 hành động "Đúng là tôi" / "Không phải tôi—khoá thẻ"). Refactor nhận diện ý định
  vào `routeIntent()` (dùng chung cho chat tự do & bước `more`); mở rộng card thành union
  `ChatCard` (confirm/auth/success + spending/forecast/fraud/goalConfirm/goalDone); thêm step
  `sg_name/sg_target/sg_auto/sg_confirm` + `fraud`; mic mô phỏng + quick replies + 4 gợi ý đầu
  phiên (Chuyển tiền/Chi tiêu/Dự báo/Đặt mục tiêu) đều chạy in-chat. Tái dùng primitives
  `Donut/Sparkline/Ring` + dữ liệu mock sẵn có (`forecast/spendCategories/fraudAlert`).
  Typecheck pass; các màn riêng Forecast/Goal/Fraud vẫn còn nhưng không vào từ Bot.
- **2026-06-19** — Sửa hoá đơn học phí trong `lib/mock.ts`: provider `ĐH Bách Khoa` →
  `ĐH Kinh tế Quốc dân`, code `HP-BK-…` → `HP-KTQD-…`; nới `findBiller()` khớp thêm
  "kinh tế/quốc dân/đại học".
- **2026-06-15** — Làm đẹp nền trang trí góc dưới sidebar dashboard (`.sidebar-art`): bỏ dải
  núi răng cưa nhiều màu + cánh diều, thay bằng **quầng sáng mềm (radial-glow)** tông xanh
  thương hiệu + dải "mặt nước" dịu. Sửa ở cả `public/dashboard` & `legacy-dashboard`, bump
  cache-bust `styles.css?v=20260615-art`.
- **2026-06-15** — Tổng quát hoá flow engine chat: hội thoại hoá thêm **mở tiết kiệm**
  (hỏi số tiền → kỳ hạn 3/6/12 → tính lãi) và **thanh toán hoá đơn** (chọn dịch vụ →
  `findBiller` khớp Điện/Nước/Internet/Học phí…). Dùng chung kiểu `Receipt` (opName/amount/
  subtitle/rows) cho thẻ xác nhận & thành công; cùng quét mặt thật + bước `more` (hỏi "còn gì
  nữa không?") + đánh giá CSAT cuối phiên. `parseTerm()`, `findBiller()` mới. Cả 3 gợi ý
  (chuyển tiền/tiết kiệm/hoá đơn) giờ chạy trong chat; màn riêng vẫn còn nhưng không vào từ Bot.
- **2026-06-15** — Hoàn thiện luồng chat chuyển tiền: (1) tách `components/FaceKyc.tsx` (camera
  thật + liveness, prop `intro`) dùng chung cho BillPay & chat — thẻ xác thực giờ **quét mặt
  thật**; (2) nút kết thúc đổi nhãn còn **"Kết thúc phiên"** (bỏ "& đánh giá"); (3) sau khi
  chuyển tiền xong Bot hỏi **"Bạn có muốn thực hiện thao tác nào khác không?"** (step `more`) —
  nói "Không/cảm ơn" mới dừng và mở **đánh giá CSAT phiên** ("Trợ lý An"); "Chuyển tiền" làm
  lại từ đầu, "tiết kiệm/hoá đơn" mở màn tương ứng.
- **2026-06-15** — Hội thoại hoá luồng **chuyển tiền** trong màn Trợ lý An (chat slot-filling,
  §13): gõ/nói "chuyển tiền" hoặc bấm gợi ý → Bot hỏi từng bước (người nhận → số tiền → lời
  nhắn) → **thẻ xác nhận** → **thẻ xác thực** (quét mặt) → **thẻ thành công** → đánh giá CSAT.
  `Assistant.tsx` giờ có state máy `step` + `draft` (useRef), thẻ trong chat (ConfirmCard/
  AuthCard/SuccessCard), trả lời nhanh (quick replies) theo bước, mic mô phỏng nói theo ngữ
  cảnh, `parseVnd()` hiểu "2 triệu/500k/2.000.000". CSS: `.msg-card`, `.qreplies/.qchip`.
  Các luồng khác (billpay/savings/goal) VẪN dùng màn riêng — có thể hội thoại hoá tương tự sau.
- **2026-06-15** — Fix UX: đánh giá bật **quá sớm** (bấm quét mặt/xác nhận mở sổ → popup đánh
  giá ngay khi chưa hoàn tất). Tách `confirm()` (xác thực xong → màn **"Thành công"**) khỏi
  `finish()` (đóng màn thành công → mới mời đánh giá). Thêm màn success cho **Transfer**,
  **Savings**, **Goal** (giống BillPay sẵn có); rating chỉ bật từ nút "Về trang chủ" trên màn
  thành công.
- **2026-06-15** — Đánh giá CSAT bật **sau MỌI thao tác hoàn tất qua Bot**: nâng overlay lên
  shell `app/user/page.tsx` (state `rateCtx` + hàm `rate(context)`), render `<SessionRating>` 1
  lần ở cấp khung điện thoại (z-index 60 > bottomnav/assistant). Cấp `rate` cho **Assistant**
  ("Trợ lý An"), **BillPay** ("Thanh toán hoá đơn" — màn done), **Transfer** ("Chuyển tiền" —
  PIN/OTP/Biometric), **Savings** ("Mở tiết kiệm"), **Goal** ("Nạp mục tiêu tiết kiệm"). Mỗi
  màn có helper `finish() = rate ? rate(ctx) : go("home")` tại điểm hoàn tất; đóng đánh giá →
  về trang chủ. Luồng `locked` (khoá do sai PIN/OTP) KHÔNG mời đánh giá.
- **2026-06-15** — Thêm chức năng **đánh giá phiên 1–5 sao (CSAT, §14)** ở `/user`:
  component tái dùng `components/SessionRating.tsx` (overlay trượt từ đáy: sao + lý do nhanh
  thích ứng theo mức điểm + góp ý + màn cảm ơn), helper `lib/feedback.ts` (lưu localStorage,
  `csatSummary()`), icon `star` trong `components/Icon.tsx`. **Chưa nối backend** —
  đánh giá lưu cục bộ; bước sau: POST `/api/v1/feedback` để feed CSAT vào dashboard.
- **2026-06-13** — Cache-busting cho console tĩnh: thêm `?v=...` vào `<script app.js>` &
  `<link styles.css>` trong `public/dashboard/index.html` + `legacy-dashboard/index.html`
  (trình duyệt hay giữ `app.js` cũ → tưởng filter/thao tác không cập nhật). Đã xác minh bằng
  jsdom: filter/search/revoke/toggle đều cập nhật DOM đúng — logic không lỗi, chỉ là cache.
- **2026-06-13** — Thêm tab **"An tâm Gia đình"** vào console phục vụ thật `/dashboard`
  (`public/dashboard/`): nav + section trong `index.html`, render/wiring trong `assets/js/app.js`,
  `data/family.json`. Console này nạp dữ liệu từ **mockapi** nên đã thêm endpoint
  `GET /api/v1/dashboard/family` (`mockapi/routers/dashboard.py`) + seed snapshot `family`
  (`db/seed.py`). Đã chạy thử: endpoint trả 6 liên kết/5 cảnh báo/4 KPI (cả json & postgres fallback).
- **2026-06-13** — Port tab **"An tâm Gia đình"** sang Next.js `/admin` (Phase 6): route mới
  `app/admin/` gồm `page.tsx` (shell sidebar + toast, các tab khác là placeholder), `FamilyAdmin.tsx`,
  `familyData.ts`, `types.ts`, `admin.css` (scope dưới `.admin-console`). Typecheck + build pass.
  Root menu vẫn trỏ `/dashboard` (console tĩnh đầy đủ); `/admin` truy cập trực tiếp.
- **2026-06-13** — Thêm tab **"An tâm Gia đình"** vào legacy-dashboard: nav + section trong
  `index.html`, `data/family.json`, render/wiring trong `assets/js/app.js` (quản lý FAMILY_LINK
  + cảnh báo gia đình; tôn trọng BR-FAM-01/02/04/05/06). LƯU Ý: bản tĩnh phục vụ tại `/dashboard`
  nằm ở `public/dashboard/` (khác `legacy-dashboard/` — bản seed). Muốn hiện ở `/dashboard` phải
  sửa cả `public/dashboard/`.
- **2026-06-13** — Tạo file CLAUDE.md này làm điểm vào context.
- *(git)* `0ee9296` feat(frontend): bill payment, family-care, iPhone shell & mobile HTTPS
- *(git)* `d60d85a` Initial commit: voicebank-inclusive project
