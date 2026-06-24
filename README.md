# VoiceBank Inclusive

Trợ lý tài chính AI **hội thoại đa phương thức** (giọng nói + chat + thẻ trực quan) nhúng trong
**VCB Digibank**, hướng tới Gen Z. Hai trụ cột: **"Dự báo"** (predictive) và **"Thấu hiểu"**
(empathetic). Toàn bộ năng lực AI chạy trên hệ sinh thái **VNPT** (SmartVoice, Smartbot, eKYC,
vnFace, SmartReader, vnSocial, SmartUX).

> Đội **DATAXTRA** · Vietnamese Student HackAIthon 2026 (Bảng B).
> Đặc tả đầy đủ: [VoiceBank_Inclusive_BUILD_SPEC.md](VoiceBank_Inclusive_BUILD_SPEC.md) — single source of truth.

## Trạng thái triển khai (§18)

| Phase | Nội dung | Trạng thái |
|---|---|---|
| **0** | Scaffold: cấu trúc repo, Docker Compose, `.env.example`, Makefile, CI, health endpoints | ✅ Done |
| 1 | Mock Bank Core (`mockapi`) + quy tắc §7 | ✅ Done (39 route §9.3 + §7 + 40 unit test) |
| 2 | Orchestrator skeleton + WebSocket + verification | ⏳ |
| 3 | Adapter VNPT + audio profiles | ⏳ |
| 4 | FlowManager + 11 luồng lõi | ⏳ |
| 5 | Engine Dự báo & luồng Gen Z | ⏳ |
| 6 | Frontend Next.js (`/user`, `/user-management`, `/admin`) | ⏳ |
| 7 | Bảo mật & tuân thủ (RBAC, PII, QĐ2345/NĐ13) | ⏳ |
| 8 | Test, WER, CI/CD, deploy | ⏳ |

## Cấu trúc repo (§6)

```
voicebank-inclusive/
├── voice2text/                 # Orchestrator (Pipecat + FastAPI) — :18889
│   ├── server.py               # FastAPI app, /health, /info (WS endpoints: Phase 2+)
│   ├── config.py               # .env + hằng số nghiệp vụ (§7/§16)
│   └── tests/
├── mockapi/                    # Mock lõi ngân hàng (FastAPI) — :18890
│   ├── server.py               # /health (~47 domain routes: Phase 1)
│   └── tests/
├── application/frontend/       # Next.js 15 (Phase 6)
│   └── legacy-dashboard/       # Dashboard quản trị tĩnh hiện có (seed cho /admin, /user-management)
├── docker/                     # Dockerfile + compose (infra + app)
├── .github/workflows/ci.yml    # Lint + test + compose validate
├── Makefile, pyproject.toml, requirements.txt, .env.example
└── VoiceBank_Inclusive_BUILD_SPEC.md
```

## Yêu cầu

Python ≥ 3.11 + [uv](https://docs.astral.sh/uv/) · Docker Compose · (Node + npm cho frontend ở Phase 6).
Khóa API VNPT là tùy chọn — đặt `*_PROVIDER=smoke` để chạy offline.

## Bắt đầu nhanh

```bash
cp .env.example .env          # điền khóa VNPT, hoặc để smoke
make install                  # tạo .venv + cài deps Python
make test                     # chạy test suite

# Demo nhanh: chạy mockapi + frontend cùng lúc (1 lệnh, Ctrl+C tắt cả hai)
make demo                     # mockapi :18890 + frontend :18891

# Hoặc chạy từng service riêng
make run-mockapi              # :18890
make run-voice2text           # :18889

# Kiểm tra health
curl http://localhost:18889/health   # {"status":"ok","service":"voice2text"}
curl http://localhost:18890/health   # {"status":"ok","service":"mockapi"}
```

### Docker

```bash
make infra-up                 # postgres + minio + mockapi
make compose-config           # validate cả 2 file compose
```

## Lệnh Makefile

```bash
make help                     # liệt kê toàn bộ target
```

| Target | Mô tả |
|---|---|
| `install` | Tạo `.venv` + cài deps Python (uv) |
| `demo` | **Chạy mockapi + frontend cùng lúc** (1 lệnh, Ctrl+C tắt cả hai) |
| `test` | Chạy pytest (`-p no:asyncio`) |
| `lint` | Ruff |
| `run-voice2text` / `run-mockapi` / `run-web` | Chạy từng service riêng |
| `infra-up` / `infra-down` | Stack Docker hạ tầng |
| `compose-config` | Validate compose |

## Frontend — chạy & test giao diện (Phase 6)

Giao diện khách hàng nằm ở [application/frontend/](application/frontend/) (Next.js 15). Demo gồm
các luồng: Trợ lý An (giọng nói/chat), thanh toán hóa đơn có xác thực PIN → OTP → eKYC khuôn mặt,
An tâm Gia đình, dự báo dòng tiền, mục tiêu tiết kiệm…

```bash
cd application/frontend
npm install                   # lần đầu
npm run dev                   # → http://localhost:18891/user
```

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server (HTTP) cho máy tính — http://localhost:18891/user |
| `npm run dev:mobile` | Dev server **HTTPS** + bind LAN để test trên điện thoại (cần cho camera) |
| `npm run build` | Build production |
| `npm run typecheck` | Kiểm tra TypeScript |

### Test trên điện thoại (camera eKYC)

Bước quét khuôn mặt dùng camera thật (`getUserMedia`) — trình duyệt **chỉ cho camera chạy ở
secure context** (`localhost` hoặc `https`). Vì vậy test trên điện thoại phải dùng HTTPS:

```bash
cd application/frontend
npm run dev:mobile            # chạy HTTPS với cert self-signed ở certificates/
```

Trên điện thoại (**cùng WiFi** với máy tính, không dùng 4G/5G):

1. Mở `https://<IP-máy-tính>:18891/user` (vd `https://192.168.1.18:18891/user`).
   Lấy IP máy: `ipconfig getifaddr en0`.
2. Bỏ qua cảnh báo chứng chỉ self-signed: Safari → *Show Details → visit this website*;
   Chrome → *Advanced → Proceed*.
3. Tới bước quét mặt → cho phép quyền **Camera**.

**Lưu ý**
- Đổi WiFi/IP khác `192.168.1.18` thì: tạo lại cert kèm IP mới và cập nhật `allowedDevOrigins`
  trong [application/frontend/next.config.ts](application/frontend/next.config.ts):
  ```bash
  cd application/frontend && openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout certificates/dev-key.pem -out certificates/dev-cert.pem -days 365 \
    -subj "/CN=voicebank-dev" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:<IP-mới>"
  ```
- macOS lần đầu có thể hỏi *"Allow incoming connections"* → chọn **Allow**.
- Nếu mở `http://<IP>` (không HTTPS): UI vẫn xem được nhưng camera sẽ bị chặn (có fallback mô phỏng).
- WiFi quán/công ty bật *AP isolation* sẽ chặn điện thoại thấy máy tính → dùng tunnel HTTPS
  (`cloudflared tunnel --url https://localhost:18891` hoặc `ngrok http https://localhost:18891`).

## Dashboard quản trị (legacy)

Dashboard giám sát Operator/Admin đã xây trước đó được giữ tại
[application/frontend/legacy-dashboard/](application/frontend/legacy-dashboard/) và sẽ được port sang
Next.js (`/user-management`, `/admin`) ở Phase 6. Xem README trong thư mục đó để chạy thử.

---

*Mọi số liệu hiện là dữ liệu mô phỏng phục vụ demo, không phải dữ liệu khách hàng thật.*

## Demo bằng 1 lệnh

Thay vì mở 2 terminal cho mockapi và frontend, chỉ cần chạy ở thư mục gốc repo:

```bash
make demo            # mockapi :18890 + frontend :18891 cùng lúc · Ctrl+C tắt cả hai
```

Sau đó mở http://localhost:18891/dashboard (console quản trị, cần mockapi) hoặc
http://localhost:18891/user (giao diện khách hàng).