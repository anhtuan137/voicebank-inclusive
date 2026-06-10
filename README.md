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
| 1 | Mock Bank Core (`mockapi`) + quy tắc §7 | ⏳ |
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

# Chạy services cục bộ
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
| `test` | Chạy pytest (`-p no:asyncio`) |
| `lint` | Ruff |
| `run-voice2text` / `run-mockapi` | Chạy từng service |
| `infra-up` / `infra-down` | Stack Docker hạ tầng |
| `compose-config` | Validate compose |

## Dashboard quản trị (legacy)

Dashboard giám sát Operator/Admin đã xây trước đó được giữ tại
[application/frontend/legacy-dashboard/](application/frontend/legacy-dashboard/) và sẽ được port sang
Next.js (`/user-management`, `/admin`) ở Phase 6. Xem README trong thư mục đó để chạy thử.

---

*Mọi số liệu hiện là dữ liệu mô phỏng phục vụ demo, không phải dữ liệu khách hàng thật.*
