# VoiceBank Inclusive — Tài liệu đặc tả hệ thống & hướng dẫn build cho AI Coding Agent

> **Mục đích của tài liệu này.** Đây là tài liệu nguồn (single source of truth) để một AI coding agent (ví dụ Claude Code) **hiểu toàn bộ hệ thống** và **xây dựng đúng theo yêu cầu dự án**. Tài liệu mô tả: bối cảnh & phạm vi, kiến trúc, tech stack, cấu trúc thư mục, từng module/giao diện, quy tắc nghiệp vụ (giá trị chính xác), mô hình dữ liệu, hợp đồng tích hợp API VNPT, engine dự báo/cá nhân hóa, phân hệ quản trị, bảo mật/tuân thủ, biến môi trường, cách build/chạy/test, và **kế hoạch triển khai theo từng giai đoạn kèm tiêu chí nghiệm thu**.
>
> Khi có mâu thuẫn, thứ tự ưu tiên: **(1) Quy tắc nghiệp vụ ở §7 → (2) Hợp đồng giao diện ở §9–§11 → (3) phần mô tả văn xuôi.** Mọi chỗ chưa chắc chắn được đánh dấu `[CẦN XÁC NHẬN]` — agent phải hỏi lại hoặc chọn mặc định an toàn và ghi chú.

---

## Mục lục
1. Bối cảnh & mục tiêu
2. Phạm vi (MVP vs tầm nhìn)
3. Nguyên tắc kiến trúc & quy ước cho agent (ĐỌC TRƯỚC KHI CODE)
4. Kiến trúc tổng thể
5. Tech stack (phiên bản cố định)
6. Cấu trúc thư mục repo
7. Quy tắc nghiệp vụ (AUTHORITATIVE — giá trị chính xác)
8. Trạng thái & vòng đời
9. Hợp đồng giao diện: WebSocket & REST
10. Mô hình dữ liệu
11. Hợp đồng tích hợp API VNPT (adapter)
12. Engine "Dự báo" & "Thấu hiểu"
13. Luồng hội thoại (intents & flows)
14. Phân hệ Quản trị & Vận hành (Admin/Operator)
15. Bảo mật & tuân thủ pháp lý
16. Biến môi trường (.env)
17. Build / chạy / test / triển khai
18. Kế hoạch triển khai theo giai đoạn + tiêu chí nghiệm thu
19. Definition of Done & checklist chất lượng

---

## 1. Bối cảnh & mục tiêu

**Sản phẩm:** *VoiceBank Inclusive* — trợ lý tài chính AI **hội thoại đa phương thức** (giọng nói + chat + thẻ trực quan), nhúng trong ứng dụng **VCB Digibank** của Vietcombank, hướng tới **thế hệ trẻ (Gen Z)**. Hai trụ cột bám đề bài: **"Dự báo"** (predictive) và **"Thấu hiểu"** (empathetic/personalized).

**Bối cảnh kỹ thuật:** Hệ thống tiến hóa từ một POC ("Banking Voicebot") đã chạy được pipeline `STT → LLM → TTS`, 11 luồng nghiệp vụ, xác thực đa kênh, ghi âm–tóm tắt–ticket và 2 trang quản trị. Nhiệm vụ build hiện tại:
1. **Chuyển toàn bộ năng lực AI sang hệ sinh thái VNPT** (bắt buộc theo cuộc thi) — thay OpenAI/ElevenLabs/Soniox/Deepgram.
2. **Tái định vị cho Gen Z** + bổ sung tính năng **dự báo & cá nhân hóa**, lớp **UI trực quan**.
3. **Tích hợp VCB Digibank** (tái dùng định danh/SSO, đổi nhận diện thương hiệu, đổi lõi mock → adapter core Vietcombank).
4. **Nâng cấp phân hệ quản trị** (dashboard giám sát hiệu suất trợ lý ảo).

**Ràng buộc cuộc thi:** AI **phải** dùng API VNPT (SmartVoice, Smartbot, eKYC, vnFace, SmartReader, vnSocial, SmartUX). MVP phải demo được, repo cài đặt 1 lệnh, có test tự động.

---

## 2. Phạm vi

### 2.1 MVP (bắt buộc cho vòng thi)
- Voice pipeline tiếng Việt qua **VNPT SmartVoice** (STT streaming + TTS), hiểu ý qua **VNPT Smartbot**.
- Các luồng giao dịch lõi: **định danh, tra số dư/lịch sử, chuyển tiền (+QR, +eKYC khi >10 triệu), gửi tiết kiệm, khóa/mở thẻ & dịch vụ, báo ATM nuốt thẻ, đặt lịch gọi lại, chuyển tổng đài viên, hướng dẫn how-to**.
- Tối thiểu **2–3 tính năng dự báo**: *insight chi tiêu, dự báo dòng tiền/cảnh báo cháy túi, mục tiêu tiết kiệm gamified*.
- Xác thực đa kênh (PIN/OTP/xác nhận/khuôn mặt) đồng bộ giọng nói ↔ UI.
- Lớp UI trực quan (thẻ insight, biểu đồ, nút hành động) trong app.
- Phân hệ quản trị: dashboard hiệu suất + hàng đợi escalation + ghi âm/transcript/tóm tắt.
- Lõi ngân hàng: dùng **mock core** (sandbox) với cấu trúc giống VCB; có adapter sẵn sàng trỏ Open API thật.

### 2.2 Ngoài phạm vi MVP (tầm nhìn sau cuộc thi)
- Tích hợp core/Open API thật của Vietcombank (chỉ làm adapter + mock ở MVP).
- Voice biometric login production-grade; chống giả mạo nâng cao.
- B2B2C licensing engine.

---

## 3. Nguyên tắc kiến trúc & quy ước cho agent — **ĐỌC TRƯỚC KHI CODE**

1. **Adapter pattern cho mọi nhà cung cấp ngoài.** Flow/Service **không bao giờ** gọi trực tiếp SDK VNPT/OpenAI. Mọi lời gọi đi qua interface trong `services/providers/*` (xem §11). Đổi nhà cung cấp = đổi adapter, không sửa flow.
2. **Không hardcode secret.** Mọi khóa/endpoint lấy từ biến môi trường (§16). Container env ưu tiên hơn `.env`.
3. **Tiền tệ là số nguyên VND (đồng).** Không dùng float cho số dư/giao dịch. Lãi suất là phần trăm (float) chỉ dùng trong công thức.
4. **PII phải được che.** Log dùng redaction (loguru). Ticket chỉ lưu **4 số cuối** điện thoại; căn cước chỉ lưu cờ "đã xác thực". **Bot không bao giờ tiết lộ PIN/OTP.**
5. **Endpoint demo-only phải đặt sau feature flag `FEATURE_DEMO=false` mặc định** và **không** được bật ở môi trường thật (ví dụ endpoint lộ OTP, kích hoạt toàn bộ thẻ, reset state).
6. **Idempotency:** `execute_pending()` chuyển tiền chỉ chạy **một lần** cho mỗi `challenge_id`. Chống double-submit ở verification (reserve/finalize).
7. **Thứ tự xác thực bắt buộc:** `PIN → OTP` (cưỡng chế bằng `VerificationStepGuard`). Giao dịch >10 triệu thêm bước eKYC khuôn mặt **trước khi** thực hiện.
8. **Chuẩn hóa số tiền tiếng Việt cho TTS** (đọc "mười triệu" thay vì "10000000").
9. **Mỗi quy tắc nghiệp vụ ở §7 phải có unit test.** Không coi là xong nếu thiếu test.
10. **Thương hiệu:** thay mọi tham chiếu "SHB"/"SHB SAHA" của POC cũ thành **"VCB"/"VCB Digibank"**; mã ngân hàng nội bộ = `"VCB"`; ví điện tử = `vcb_pay`.
11. **Ngôn ngữ:** giao diện & hội thoại tiếng Việt; code, định danh, commit message tiếng Anh.
12. **Đa phương thức đồng bộ:** mọi câu trả lời thoại quan trọng phải kèm "UI event" để client hiển thị thẻ trực quan (xem `emit_ui_card` ở §9).

---

## 4. Kiến trúc tổng thể

Bốn lớp, triển khai dưới dạng **module nhúng trong VCB Digibank**:

```
[ Client trong VCB Digibank ]   SDK giọng nói (AudioWorklet PCM16) + thẻ trực quan + popup xác thực
            │  WebSocket song công (PCM16 in/out + control JSON)
            ▼
[ Orchestrator: voice2text :18889 ]  FastAPI + Pipecat
   - Voice pipeline (STT → hiểu ý → TTS)
   - FlowManager (máy trạng thái hội thoại)
   - Verification Registry (PIN/OTP/confirm/face)
   - Engine Dự báo & Thấu hiểu
            │  httpx (REST)                         │ adapter
            ▼                                        ▼
[ Mock Bank Core: mockapi :18890 ]        [ AI VNPT: SmartVoice, Smartbot, eKYC,
   ~47 REST endpoint (sandbox)              vnFace, SmartReader, vnSocial, SmartUX ]
            │
            ▼
[ Hệ thống Vietcombank ]  Core/Open API (qua adapter) · Định danh & SSO · Bảo mật/tuân thủ
```

**Cơ chế điều phối:**
- **Pipeline tuyến tính (Pipecat):** chuỗi ~22 processor (xem §9.4).
- **Máy trạng thái (pipecat-ai-flows):** `FlowManager`, mỗi handler trả `(result, next_node)`; node đầu là `greeting`.
- **Event-driven verification:** server đẩy frame `action_required` qua registry in-memory; client trả `action_result`.
- **Service orchestration:** flow → `services/*` → adapter → mockapi/VNPT.

Frontend: Next.js App Router, 3 view — `/user` (khách), `/user-management` (Operator), `/admin` (Admin); mỗi `app/api/*/route.ts` là proxy server-side.

---

## 5. Tech stack (phiên bản cố định)

| Hạng mục | Công nghệ | Phiên bản |
|---|---|---|
| Backend lang | Python | >= 3.11 |
| Voice pipeline | pipecat-ai | 0.0.105 |
| Flow engine | pipecat-ai-flows | 0.0.23 |
| Web framework | FastAPI | 0.115.0 |
| ASGI | Uvicorn[standard] | 0.30.0 |
| HTTP client | httpx | 0.27.0 |
| Logging | loguru | >= 0.7.2 |
| STT / TTS | **VNPT SmartVoice** | API (gRPC streaming + REST) |
| NLU + LLM | **VNPT Smartbot** | API |
| Sinh trắc / OCR | **VNPT eKYC + vnFace + SmartReader** | API (REST) |
| Cảm xúc / trend | **VNPT vnSocial** | API |
| Đo UX | **VNPT SmartUX** | SDK/JS |
| VAD | Silero | — |
| Chuẩn hóa text VI | vi-cleaner, vietnam-number | — |
| Object storage | AWS S3 / MinIO (boto3, aioboto3) | — |
| Database | PostgreSQL 16+ / JSON file (theo `DB_SOURCE`) | psycopg[binary] >= 3.2.9 |
| Frontend | Next.js (App Router) | 15.3.3 |
| UI runtime | React | 19.0.0 |
| FE language | TypeScript | 5.8.3 |
| Audio browser | Web Audio AudioWorklet | — |
| Package mgr | uv (Python), npm workspaces (JS) | — |
| Container | Docker Compose | — |
| Reverse proxy | nginx (TLS, định tuyến WS) | — |
| CI/CD | GitHub Actions | — |
| Test | pytest, pytest-asyncio | 8.3.0 / 0.23.0 |

> **Lưu ý kế thừa:** Mọi cấu phần OpenAI/ElevenLabs/Soniox/Deepgram của POC cũ **bị thay** bằng adapter VNPT tương ứng (§11). Giữ adapter "smoke/mock" để demo offline khi không có khóa API.

---

## 6. Cấu trúc thư mục repo

```
voicebank-inclusive/
├── voice2text/                 # Orchestrator (Pipecat + FastAPI) — :18889
│   ├── server.py               # FastAPI app, HTTP routes + WS endpoints
│   ├── bot_websocket.py        # Pipeline chính (entry run_websocket_bot)
│   ├── smoke_bot.py            # Bot mô phỏng audio (demo offline)
│   ├── config.py               # .env + SYSTEM_PROMPT + hằng số nghiệp vụ
│   ├── audio_profiles.py       # Factory STT/TTS/VAD theo profile
│   ├── flows/                  # Luồng hội thoại + index.py + utils.py
│   ├── services/
│   │   ├── providers/          # ADAPTER VNPT: stt.py, tts.py, nlu.py, ekyc.py, vnsocial.py, smartux.py
│   │   ├── banking_api.py      # httpx client → mockapi / core adapter
│   │   ├── transfer_service.py
│   │   ├── savings_service.py
│   │   └── prediction_service.py  # NEW: engine Dự báo & Thấu hiểu
│   ├── interactions/           # verification.py, tickets.py, recordings.py, db.py, otp.py
│   └── processors/             # Frame processors Pipecat (sentiment, normalizer, guard, recorder…)
├── mockapi/                    # Mock lõi ngân hàng (FastAPI) — :18890
│   ├── server.py               # ~47 routes (wiring mỏng)
│   └── mock_api/               # auth, card, transaction, service, branch, callback, vcb_pay,
│                               # savings, transfer, transfer_pending, kyc, contacts_store,
│                               # db.py, database.json, savings_data.json
├── application/frontend/       # Next.js 15 App Router — :18891
│   └── app/{user,user-management,admin,components,lib,api}
│       └── lib/voiceCall.ts    # class VoiceCall (WS PCM16 duplex, barge-in, action_result)
├── docker/                     # compose layers + nginx (prod)
├── Makefile, pyproject.toml, uv.lock, requirements.txt, .env.example
└── README.md, AGENTS.md (tài liệu này hoặc rút gọn)
```

**Quy ước:** mỗi luồng = `*_flow.py` trả về `dict` node → `flows/index.py` merge thành 1 graph (node đầu `greeting`). Mock core tách theo domain. FE: thư mục = route.

---

## 7. Quy tắc nghiệp vụ (AUTHORITATIVE — giá trị phải khớp chính xác)

> Đây là phần ràng buộc mạnh nhất. Mọi giá trị dưới đây phải được implement đúng và **có unit test**.

### 7.1 Xác thực (Authentication)
| Mã | Quy tắc | Giá trị |
|---|---|---|
| BR-AUTH-01 | OTP gồm **6 chữ số** | 6 |
| BR-AUTH-02 | OTP hết hạn sau **5 phút** | 5 phút |
| BR-AUTH-03 | Sai PIN quá **5 lần** → khóa tài khoản **15 phút** + chuyển tổng đài viên | 5 lần / 15 phút |
| BR-AUTH-04 | Sai OTP quá **5 lần** → khóa **15 phút** | 5 lần / 15 phút |
| BR-AUTH-05 | Hết khóa **tự mở sau 15 phút** (PIN & OTP đếm riêng) | 15 phút |
| BR-AUTH-06 | Bộ đếm sai OTP **không reset** khi gửi OTP mới (chống lách) | — |
| BR-AUTH-07 | Xác thực PIN thành công **reset** bộ đếm khóa OTP | — |
| BR-AUTH-08 | **THỐNG NHẤT:** giới hạn sai PIN/OTP = **5 lần** ở cả backend lẫn thông báo UI (POC cũ mâu thuẫn 3 vs 5 — chọn 5 và sửa mọi message) | 5 |

### 7.2 Chuyển tiền (Money Transfer)
| Mã | Quy tắc | Giá trị |
|---|---|---|
| BR-TRF-01 | Số tiền tối thiểu | **5.000đ** |
| BR-TRF-02 | Lời nhắn tối đa | **210 ký tự** |
| BR-TRF-03 | Không vượt số dư khả dụng | — |
| BR-TRF-04 | Tài khoản nguồn bị khóa → chặn | — |
| BR-TRF-05 | Số tài khoản người nhận tối thiểu | **6 chữ số** |
| BR-TRF-06 | Tên người nhận **luôn do hệ thống tra** từ STK+ngân hàng; không tra được → từ chối | — |
| BR-TRF-07 | **>10.000.000đ/giao dịch HOẶC tổng >20.000.000đ/ngày → bắt buộc eKYC khuôn mặt** trước khi thực hiện (đúng QĐ 2345/QĐ-NHNN) | 10tr / 20tr |
| BR-TRF-08 | Chuyển nội bộ ghi có người nhận; mã NH nội bộ = `"VCB"` | — |
| BR-TRF-09 | QR có amount cố định → không cho sửa số tiền | — |

### 7.3 Gửi tiết kiệm (Savings)
| Mã | Quy tắc | Giá trị |
|---|---|---|
| BR-SAV-01 | Số tiền gửi tối thiểu (cả 2 loại sổ) | **1.000.000đ** |
| BR-SAV-02 | Gửi góp tự động tối thiểu, **chỉ sổ gửi góp (goal)** | **200.000đ** |
| BR-SAV-03 | Lãi suất chỉ lấy từ biểu lãi suất sản phẩm | — |
| BR-SAV-04 | Công thức lãi **đơn**: `gốc × (lãi_suất/100) × (kỳ_hạn_tháng/12)` | — |
| BR-SAV-05 | Tài khoản nguồn khóa → không mở; số dư phải đủ | — |
| BR-SAV-06 | Trừ tiền gốc từ TK thanh toán **ngay khi mở** | — |
| BR-SAV-07 | Hình thức đến hạn mặc định: `principal_interest_to_checking` | — |
| BR-SAV-08 | Chỉ sổ `active` mới phong tỏa; chỉ sổ `frozen` mới giải tỏa | — |

### 7.4 Tổng đài viên & khác
| Mã | Quy tắc | Giá trị |
|---|---|---|
| BR-AGT-01 | Giờ phục vụ tổng đài viên | **8h–22h** |
| BR-AGT-02 | Mô phỏng tổng đài viên rảnh | **80%** (bận → đề nghị đặt lịch) |
| BR-IDLE-01 | Khách im lặng **20 giây** → nhắc lại; tối đa **2 lần** rồi kết thúc | 20s / 2 lần |
| BR-SVC-01 | Tên dịch vụ hợp lệ chỉ gồm **SMS Banking** và **Internet Banking** | — |
| BR-KYC-01 | Xác thực khuôn mặt gồm **2 bước**: normal + liveness | — |
| BR-SEC-01 | Không truyền số điện thoại làm tham số cho hàm khóa dịch vụ | — |
| BR-SEC-02 | Ticket lưu **4 số cuối** điện thoại; căn cước chỉ lưu cờ "đã xác thực" | — |
| BR-PIN-01 | Bot **tuyệt đối không tiết lộ PIN** | — |

---

## 8. Trạng thái & vòng đời

- **Thẻ (Card):** `active → locked` (khóa thẻ, lưu DB) ; `active → temp_locked` (ATM nuốt thẻ, in-memory) ; `locked → active` (mở) ; `temp_locked → active` (reset demo).
- **Sổ tiết kiệm:** `active → frozen` (chỉ sổ active) ; `frozen → active` (chỉ sổ frozen).
- **Chuyển tiền giá trị cao:** `ready` (≤10tr) hoặc `pending_kyc` (>10tr, có `challenge_id`) → `pending_kyc → ready` (eKYC 2/2 đạt) → `ready → executed` (chạy **1 lần duy nhất**).
- **Tài khoản bị khóa do sai PIN/OTP:** `normal → locked_15min` (sai >5 lần) → `locked_15min → normal` (tự mở sau 15 phút); voicebot chuyển tổng đài viên khi phát hiện khóa.

---

## 9. Hợp đồng giao diện: WebSocket & REST

### 9.1 WebSocket `/ws/bot` (cuộc gọi thật) & `/ws/bot-smoke` (demo)
**Server → Client:**
```json
{ "type": "voice_config", "session_id": "...", "sample_rate": 24000 }
{ "type": "action_required", "step": { "kind": "pin|otp|confirm_action|display|face_recognition",
                                        "step_id": "...", "prompt": "...", "meta": {} } }
{ "type": "ui_card", "card": { "kind": "balance|spending|forecast|goal|transfer_success|...", "data": {} } }
```
**Client → Server:**
- Binary frames: **PCM16 mono 16 kHz** (mic).
- `{ "type": "action_result", "step_id": "...", "value": "123456" | { "confirmed": true } | "<base64 image>" }`
- `{ "type": "text", "text": "..." }` (nhập tay/thay thoại).

**Audio ra:** PCM16 mono **24 kHz**, chunk ~40 ms.

### 9.2 voice2text REST (:18889)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/health`, `/info` | Health / metadata |
| GET/POST | `/recordings`, `/tickets` | Đọc/ghi ghi âm & ticket |
| POST | `/rating` | Lưu đánh giá 1–5 |
| GET | `/analytics/summary` | KPI + chart (lọc ngày) cho dashboard |
| GET | `/escalations`, POST `/escalations/{id}` | Hàng đợi chuyển nhân viên + cập nhật trạng thái |
| GET | `/recordings/url`, `/audio-proxy` | Presigned URL / stream WAV |
| GET/POST | `/wer`, `/api/wer/evaluate` | Đánh giá WER |
| WS | `/ws/bot`, `/ws/bot-smoke` | Cuộc gọi thật / mô phỏng |
| POST | `/debug/emit-verification` | **(FEATURE_DEMO)** đẩy prompt xác thực |

### 9.3 mockapi REST (:18890, ~47 route — nhóm chính)
| Nhóm | Endpoint |
|---|---|
| Health/Demo | `GET /health`, **(DEMO)** `POST /demo-reset`, `POST /api/activate-all-{cards,services}` |
| Customers | `GET/POST /customers`, `PATCH/DELETE /customers/{phone}` |
| Auth | `POST /auth/{verify-pin,send-otp,verify-otp,reset-attempts}`, **(DEMO)** `GET /internal/auth/latest-otp` |
| Card | `GET /card/status`, `POST /card/{lock,unlock,temp-lock}` |
| Service | `GET /service/status`, `POST /service/{lock,unlock}` |
| Transactions | `GET /transactions`, `GET /transactions/{id}` |
| Savings | `GET /savings/{interest-rates,calculate-interest,list}`, `POST /savings/{open,freeze,unfreeze}` |
| Transfer | `GET /transfer/banks`, `POST /transfer/{lookup,execute,verify,bank-transfer,parse-qr}` |
| KYC | `POST /kyc/biometric/verify` |
| Beneficiary/Contact | `GET/POST /beneficiaries`, `POST /beneficiaries/search`, `GET/POST/DELETE /contacts` |
| Khác | `GET /branch/nearest`, `GET /vcb-pay/{wallet-balance,usage-guide}`, `POST /callback`, `GET /callbacks` |
| **NEW** Insights | `GET /insights/spending`, `GET /insights/forecast`, `GET/POST /goals` |

### 9.4 Thứ tự processor pipeline (tham chiếu — `bot_websocket.py`)
`transport.input → action_result_listener → customer_context → text_input → STT → stt_normalizer → sentiment → pronoun → user_trace → ctx.user → ctx_pruner → transcript_window → LLM(Smartbot) → VN_sentence_aggregator* → tool_call_preamble → bot_trace → tts_normalizer → TTS → pre_notifier → transport.output → post_notifier → AudioRecorder → ctx.assistant`
(*chỉ chèn nếu `should_use_sentence_aggregator(tts_provider)`)

Idle/reprompt (BR-IDLE-01); end-of-call gate → tóm tắt AI → tạo ticket → upload S3.

---

## 10. Mô hình dữ liệu

```
CUSTOMER ||--o{ TRANSACTION : card_last4
CUSTOMER ||--o{ SAVINGS_ACCOUNT : owner_phone
CUSTOMER ||--o{ GOAL : owner_phone           # NEW
CUSTOMER ||--o{ INSIGHT : owner_phone         # NEW
CUSTOMER ||--o{ BENEFICIARY : phone
CUSTOMER ||--o{ CONTACT : owner_phone
CUSTOMER ||--o{ CONSENT : owner_phone         # NEW
BANK     ||--o{ TRANSACTION : source/dest
SAVINGS_ACCOUNT }o--|| INTEREST_RATE : term_months
```

| Thực thể | Trường chính |
|---|---|
| **CUSTOMER** | `registered_phone` (PK), `phone_last4`, `name`, `cccd`, `account_number`, `card_last4`, `card_status` (active/locked/temp_locked), `pin`, `otp_secret`, `account_balance` (int VND), `vcb_pay_balance` (int), `sms_banking_active` (bool), `internet_banking_active` (bool), `age`, `personality` (cá nhân hóa giọng) |
| **TRANSACTION** | `id` (PK), `date`, `amount` (int), `desc`, `transaction_type`, `category` (NEW: nhóm chi tiêu), `source_account` (obj), `destination_account` (obj) |
| **SAVINGS_ACCOUNT** | `id` (PK), `type` (flexible/goal), `principal` (int), `term_months`, `rate` (float), `maturity_date`, `status` (active/frozen), `auto_deposit` (obj) |
| **GOAL** (NEW) | `id`, `owner_phone`, `name`, `target_amount`, `current_amount`, `auto_deposit`, `streak`, `created_at` |
| **INSIGHT** (NEW) | `id`, `owner_phone`, `period`, `forecast_balance`, `alert_level`, `suggestions` (list) |
| **CONSENT** (NEW) | `owner_phone`, `scope`, `granted_at`, `status` (phục vụ NĐ 13/2023) |
| **BENEFICIARY** | `beneficiary_id` (PK), `phone`, `bank_code`, `account_number`, `name`, `nickname` |
| **BANK** | `bank_code` (PK), `short_name`, `name`, `bin`, `pronunciation` |
| **TICKET** | `id`, `phone_last4`, `summary` (AI), `issue`, `status`, `created_at` |
| **RECORDING** | `id`, `session`, `time`, `turns`, `transcript`, `wav_url` |

**Ghi chú:** `resolve_phone_key` cho phép match 4 số cuối. Transaction keyed bởi `card_last4`. External account key = `"BANK_CODE:ACCOUNT_NUMBER"`. Biểu lãi suất 1–36 tháng (ví dụ 4.75%–8.3%) trong `savings_data.json`. Persistence dual-backend (`db.py` route JSON ↔ Postgres theo `DB_SOURCE`; seed từ JSON khi bảng rỗng; fallback JSON khi Postgres lỗi).

---

## 11. Hợp đồng tích hợp API VNPT (adapter)

Tất cả đặt trong `voice2text/services/providers/`. Mỗi adapter là một class/hàm thuần, nhận/ trả kiểu dữ liệu nội bộ (không lộ chi tiết SDK ra ngoài). Có biến `*_PROVIDER` để chọn `vnpt` hoặc `smoke` (mock).

```python
# stt.py — VNPT SmartVoice STT (gRPC streaming)
async def stream_transcribe(audio_chunks: AsyncIterator[bytes]) -> AsyncIterator[Transcript]:
    """PCM16 16kHz → Transcript{text, is_final, confidence}. Hỗ trợ 3 giọng vùng miền."""

# tts.py — VNPT SmartVoice TTS
async def synthesize(text: str, voice: str = "north", rate: float = 1.0) -> bytes:
    """Trả PCM16 mono 24kHz. text đã qua chuẩn hóa số tiền tiếng Việt."""

# nlu.py — VNPT Smartbot
async def detect_intent(text: str, context: dict) -> Intent:   # Intent{name, entities, confidence}
async def chat(messages: list, tools: list | None) -> ChatResult  # hỗ trợ function-calling
async def summarize(transcript: list) -> str                   # tóm tắt cuộc gọi (SmartVoice/Smartbot)

# ekyc.py — VNPT eKYC + vnFace
async def verify_face(image_b64: str, ref: str | None) -> KycResult  # {liveness: bool, match: bool, score}
async def ocr_id(image_b64: str) -> IdFields                         # bóc tách CCCD (eKYC OCR / SmartReader)

# vnsocial.py — cảm xúc & xu hướng lừa đảo
async def sentiment(text: str) -> float        # [-1, 1]
async def scam_trends() -> list[str]

# smartux.py — đo lường UX
async def track(event: str, props: dict) -> None
```

**Bảng thay thế (POC cũ → VNPT):**

| Hạng mục | POC cũ (bỏ) | Thay bằng |
|---|---|---|
| STT | Soniox/ElevenLabs | SmartVoice STT (gRPC streaming) |
| TTS | ElevenLabs/Soniox | SmartVoice TTS (3 miền) |
| NLU+LLM | OpenAI GPT-4.1 | Smartbot |
| KYC khuôn mặt | `kyc.py` mock (pass mọi ảnh) | eKYC liveness + compare |
| OCR | (chưa có) | eKYC OCR / SmartReader |
| Tóm tắt | OpenAI | SmartVoice/Smartbot summarize |
| Cảm xúc | processor nội bộ | vnSocial sentiment |
| Đo UX | thủ công | SmartUX |

> **Quan trọng:** adapter `kyc.py` mock cũ chấp nhận mọi ảnh không rỗng — **chỉ dùng cho `FEATURE_DEMO`**. Production phải gọi eKYC thật.

---

## 12. Engine "Dự báo" & "Thấu hiểu" — `services/prediction_service.py`

### 12.1 Dự báo (Predictive)
```python
def categorize(transactions: list[Transaction]) -> list[Transaction]:
    """Gắn category bằng merchant-map + rule + NLP nội dung CK. (ăn uống, mua sắm, hóa đơn, đi lại…)"""

def forecast_balance(history: list[Transaction], current_balance: int, horizon_days: int) -> Forecast:
    """Khởi điểm: trung bình trượt + thành phần định kỳ (lương/hóa đơn). Trả {end_balance, daily_curve, alert_level}.
       alert_level='warn' nếu end_balance < SAFE_THRESHOLD."""

def generate_nudges(profile: dict, forecast: Forecast) -> list[str]:
    """Sinh gợi ý cá nhân hóa: cảnh báo cháy túi, mức nên tiết kiệm, nhắc hóa đơn."""

def detect_fraud(tx: Transaction, history: list, trends: list[str]) -> Risk:
    """Luật rủi ro (giá trị/tần suất/người nhận lạ) + xu hướng lừa đảo (vnSocial). Trả {risk, reason}."""
```

### 12.2 Thấu hiểu (Empathetic / Personalization)
```python
def personalize(profile: dict) -> VoiceStyle:
    """Từ age/personality/region → {voice_region, rate, tone}. Dùng cho TTS & văn phong."""

def adjust_for_sentiment(reply: str, sentiment: float) -> str:
    """sentiment < ngưỡng (lo lắng/bực) → giọng trấn an, câu ngắn, đề nghị hỗ trợ."""
```

**Privacy-by-design:** chỉ phân tích khi `CONSENT.status == granted`; tối thiểu hóa & ẩn danh; không log dữ liệu nhạy cảm.

---

## 13. Luồng hội thoại (intents & flows)

Mỗi flow = `flows/<name>_flow.py` trả `dict` node, merge qua `flows/index.py`. `greeting_flow` định danh (số điện thoại + căn cước) rồi `route_to_intent()`. Hỗ trợ **đổi ý giữa luồng** (`cancel_current_flow=true`).

**Kế thừa (11):** `card_lock`, `card_swallowed`, `transaction` (balance/history), `money_transfer` (+QR +eKYC>10tr), `savings`, `service_lock`, `vcb_pay` (đổi tên từ shb_pay), `callback`, `transfer` (chuyển tổng đài viên), `guidance` (how-to), định tuyến `greeting`.

**Mới (Gen Z / dự báo):**
- `spending_insight_flow` — hỏi đáp chi tiêu, trả `ui_card{kind:spending}`.
- `cashflow_forecast_flow` — dự báo dòng tiền, cảnh báo cháy túi, `ui_card{kind:forecast}`.
- `savings_goal_flow` — đặt mục tiêu bằng giọng nói, bật gửi góp tự động, `ui_card{kind:goal}`, gamification (streak/huy hiệu).
- `fraud_alert_flow` — cảnh báo giao dịch bất thường / xu hướng lừa đảo.

**Luồng chuẩn (ví dụ chuyển tiền >10tr):**
```
nhận yêu cầu → tra tên người nhận (BR-TRF-06) → nhập số tiền + lời nhắn
  → validate (BR-TRF-01/02/03/05) → xác nhận (confirm_action) → PIN → OTP
  → nếu >10tr/giao dịch hoặc >20tr/ngày: eKYC khuôn mặt 2 bước (BR-KYC-01, BR-TRF-07)
  → execute_pending() (1 lần) → ghi nợ/ghi có → emit ui_card{transfer_success}
```

---

## 14. Phân hệ Quản trị & Vận hành (Admin/Operator)

Hai view Next.js (kế thừa & nâng cấp từ POC). Có RBAC (xem §15).

| Vai trò | Quyền |
|---|---|
| **Operator** (`/user-management`) | Tra cứu khách (chỉ đọc, ẩn/hiện số dư), trạng thái thẻ/dịch vụ; ghi âm + transcript + tóm tắt AI; **dashboard hiệu suất**; **hàng đợi escalation** (tiếp nhận/hoàn tất) |
| **Admin** (`/admin`) | CRUD khách hàng theo quyền, danh bạ, kịch bản/intent; phân quyền; toàn bộ dashboard + log kiểm toán; quản trị môi trường (FEATURE_DEMO) |

**Dashboard hiệu suất (nguồn dữ liệu: `GET /analytics/summary` + `GET /escalations`):**
- **Mức độ sử dụng:** tổng lượt, theo thời gian, theo nghiệp vụ, người dùng hoạt động.
- **Hiệu quả:** tỷ lệ hoàn tất (containment), tỷ lệ chuyển nhân viên, thời gian xử lý TB, WER, độ trễ.
- **Hài lòng & phản hồi:** CSAT (1–5), phân bố đánh giá, nghiệp vụ bị đánh giá thấp.
- **Vận hành:** hàng đợi escalation, lý do chuyển, thời gian chờ (SLA), khối lượng theo giờ.

Dữ liệu hành vi đẩy qua **VNPT SmartUX**. Escalation reasons: *khách yêu cầu, bot không hiểu, khóa thẻ khẩn cấp, khóa dịch vụ, chuyển tiền, mở tiết kiệm, tra số dư, tra lịch sử*.

---

## 15. Bảo mật & tuân thủ pháp lý

1. **Xác thực & RBAC/SSO:** tái dùng định danh Vietcombank; phân quyền 3 vai (Customer/Operator/Admin). Không có route quản trị nào public.
2. **Bảo vệ dữ liệu:** mã hóa khi truyền (TLS/wss) và khi lưu; che PII trong log (loguru redaction); ghi **audit log** cho thao tác quản trị & giao dịch; tối thiểu hóa dữ liệu.
3. **Tuân thủ:** **QĐ 2345/QĐ-NHNN** (sinh trắc giao dịch lớn — BR-TRF-07) & **NĐ 13/2023/NĐ-CP** (dữ liệu cá nhân — CONSENT). Không hiển thị PIN/OTP dạng rõ ở môi trường thật.
4. **Demo-only nguy hiểm:** `/internal/auth/latest-otp`, `demo-reset`, `activate-all-*`, kyc mock — **chỉ bật khi `FEATURE_DEMO=true`**, mặc định tắt.
5. **Chống lạm dụng:** rate-limit endpoint nhạy cảm; idempotency chuyển tiền; cưỡng chế thứ tự PIN→OTP.

---

## 16. Biến môi trường (.env)

| Nhóm | Biến | Ý nghĩa |
|---|---|---|
| Provider chọn | `STT_PROVIDER`, `TTS_PROVIDER`, `NLU_PROVIDER` = `vnpt`/`smoke` | Chọn adapter |
| VNPT SmartVoice | `SMARTVOICE_API_KEY`, `SMARTVOICE_STT_ENDPOINT`, `SMARTVOICE_TTS_ENDPOINT`, `SMARTVOICE_VOICE_ID` | STT/TTS |
| VNPT Smartbot | `SMARTBOT_API_KEY`, `SMARTBOT_ENDPOINT`, `SMARTBOT_BOT_ID` | NLU+LLM |
| VNPT eKYC/vnFace | `EKYC_API_KEY`, `EKYC_ENDPOINT`, `VNFACE_API_KEY` | Sinh trắc/OCR |
| VNPT vnSocial/SmartUX | `VNSOCIAL_API_KEY`, `SMARTUX_KEY` | Cảm xúc/đo UX |
| Ports | `VOICE2TEXT_PORT=18889`, `MOCKAPI_PORT=18890`, `WEB_PORT=18891` | Cổng |
| Wiring | `BANKING_BACKEND_BASE_URL`, `MOCKAPI_BASE_URL`, `AUDIO_BACKEND_BASE_URL` | Trỏ service |
| Audio/VAD | `WEB_AUDIO_OUT_SAMPLE_RATE=24000`, `WEB_AUDIO_OUT_CHUNK_MS=40`, `WEB_VAD_*`, `WEB_ALLOW_INTERRUPTIONS` | Audio |
| Idle/Agent | `IDLE_TIMEOUT_SECS=20`, `MAX_IDLE_REPROMPTS=2`, `AGENT_AVAILABLE_START=8`, `AGENT_AVAILABLE_END=22` | Hành vi cuộc gọi |
| Nghiệp vụ | `TRANSFER_KYC_THRESHOLD=10000000`, `TRANSFER_DAILY_KYC_THRESHOLD=20000000`, `MAX_AUTH_ATTEMPTS=5`, `LOCK_MINUTES=15`, `OTP_TTL_MINUTES=5` | Hằng số (khớp §7) |
| DB | `DB_SOURCE=json|postgres`, `DATABASE_URL`, `POSTGRES_*` | Persistence |
| S3 | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `MINIO_SERVER` | Ghi âm |
| Logging | `LOG_LEVEL`, `LOG_TO_FILE`, `LOG_DIR` | loguru (có redaction) |
| Frontend/CORS | `NEXT_PUBLIC_ORCHESTRATOR_BASE_URL`, `FRONTEND_CORS_ORIGINS` | Browser/CORS |
| **Flag** | `FEATURE_DEMO=false` | Bật/tắt endpoint demo-only |

---

## 17. Build / chạy / test / triển khai

**Yêu cầu:** Python>=3.11 + uv; Node + npm; Docker Compose; khóa API VNPT (hoặc dùng `*_PROVIDER=smoke` để chạy offline).

**Local (khuyến nghị):**
```bash
pip install uv && make install
cp .env.example .env                 # điền khóa VNPT (hoặc để smoke)
docker compose -f docker/docker-compose.infra.yml --env-file .env up -d   # postgres + minio + mockapi
make run-voice2text                  # :18889
make run-web                         # :18891 → http://localhost:18891/user
# Bật toggle "Giả lập" để dùng smoke bot (không cần khóa API).
```

**Test:**
```bash
.venv/bin/python -m pytest voice2text/tests mockapi/tests -p no:asyncio
DURATION_S=30 bash voice2text/tests/run_smoke_verification.sh   # probe verification wire
```

**CI/CD (GitHub Actions):** frontend `next build` + TS check; `pytest` mockapi + voice2text; `docker compose config` validate; deploy SSH (chờ CI) → `git pull && docker compose … up -d --build`. Prod: thêm `.prod.yml` + `nginx.prod.yml` (TLS, proxy `wss://<host>/ws/bot` → voice2text:18889).

---

## 18. Kế hoạch triển khai theo giai đoạn + tiêu chí nghiệm thu

> Agent thực thi **tuần tự**; mỗi phase phải đạt tiêu chí nghiệm thu trước khi sang phase sau.

**Phase 0 — Scaffold.** Tạo repo theo §6, Docker Compose, `.env.example`, Makefile, CI cơ bản.
*Nghiệm thu:* `docker compose config` hợp lệ; `make install` chạy; health endpoints trả 200.

**Phase 1 — Mock Bank Core (`mockapi`).** Domain modules + seed `database.json`/`savings_data.json` + **toàn bộ quy tắc §7** + endpoints §9.3 + unit test cho từng BR.
*Nghiệm thu:* test bao phủ BR-AUTH/TRF/SAV/AGT pass; dual-backend JSON/Postgres chạy.

**Phase 2 — Orchestrator skeleton.** FastAPI + WebSocket `/ws/bot` + `voice_config` + `interactions/verification.py` (registry, reserve/finalize, VerificationStepGuard).
*Nghiệm thu:* client kết nối WS, nhận `voice_config`, vòng đời action_required/result chạy với smoke.

**Phase 3 — Adapter VNPT + audio_profiles.** Implement `services/providers/*` (stt, tts, nlu, ekyc, vnsocial, smartux) + smoke fallback + factory theo `*_PROVIDER`.
*Nghiệm thu:* STT→TTS tiếng Việt chạy qua SmartVoice; chuyển đổi sang `smoke` không sửa flow.

**Phase 4 — FlowManager + luồng lõi.** `greeting/route_to_intent` + 11 luồng kế thừa, dùng Smartbot intent + function-calling; chuyển tiền >10tr gọi eKYC thật.
*Nghiệm thu:* mỗi luồng demo end-to-end; xác thực PIN→OTP→(eKYC) đúng thứ tự; idempotency execute.

**Phase 5 — Engine Dự báo & luồng Gen Z.** `prediction_service.py` (categorize/forecast/nudges/fraud/personalize/sentiment) + `spending_insight/cashflow_forecast/savings_goal/fraud_alert` flows + `ui_card`.
*Nghiệm thu:* hỏi "tháng này tiêu gì nhiều nhất?" trả insight + card; cảnh báo cháy túi hoạt động; mục tiêu tiết kiệm + gửi góp tự động (BR-SAV-02).

**Phase 6 — Frontend.** `/user` (voice + thẻ trực quan động + popup xác thực, dark mode, nhận diện VCB) ; `/user-management` (dashboard hiệu suất + escalation) ; `/admin` (CRUD + analytics + log). `lib/voiceCall.ts` (PCM16 duplex, barge-in, action_result).
*Nghiệm thu:* gọi voicebot từ browser hoạt động; dashboard hiển thị KPI từ `/analytics/summary`; escalation tiếp nhận/hoàn tất được.

**Phase 7 — Bảo mật & tuân thủ.** RBAC/SSO, PII masking, audit log, `FEATURE_DEMO` gating, rate-limit, alignment QĐ2345/NĐ13, CONSENT.
*Nghiệm thu:* route quản trị chặn khi thiếu quyền; demo endpoints tắt khi `FEATURE_DEMO=false`; log không lộ PIN/OTP/số điện thoại đầy đủ.

**Phase 8 — Test, WER, CI/CD, deploy.** Unit + regression + WER smoke; pipeline CI xanh; compose prod + nginx.
*Nghiệm thu:* repo cài 1 lệnh; test suite pass trên JSON & Postgres; demo ổn định (chạy ≥ 3 lần không lỗi).

---

## 19. Definition of Done & checklist chất lượng

- [ ] Mọi giá trị §7 implement đúng và **có unit test**.
- [ ] AI chỉ dùng **adapter VNPT** (không gọi provider trực tiếp trong flow).
- [ ] Không có secret trong code; mọi cấu hình qua `.env`.
- [ ] Số dư/giao dịch là **int VND**; không float.
- [ ] **PIN không bao giờ bị lộ**; log che PII; ticket chỉ 4 số cuối.
- [ ] Endpoint demo-only sau `FEATURE_DEMO`, **mặc định tắt**.
- [ ] `execute_pending()` idempotent; thứ tự PIN→OTP→(eKYC) cưỡng chế.
- [ ] Chuyển tiền >10tr/ >20tr-ngày bắt buộc eKYC (QĐ 2345).
- [ ] Mỗi câu trả lời thoại quan trọng kèm `ui_card` cho lớp trực quan.
- [ ] Dashboard hiệu suất lấy số liệu thật từ `/analytics/summary` & `/escalations`.
- [ ] Repo cài đặt 1 lệnh; CI xanh; demo chạy ≥ 3 lần không lỗi.
- [ ] Mọi tham chiếu "SHB" cũ đã đổi thành "VCB".

---

*Tài liệu này là bản đặc tả build cho AI coding agent — Dự án VoiceBank Inclusive · Đội DATAXTRA · Vietnamese Student HackAIthon 2026 (Bảng B). Cập nhật khi phạm vi thay đổi; mục `[CẦN XÁC NHẬN]` cần chốt với mentor/đối tác trước khi tích hợp môi trường thật.*
