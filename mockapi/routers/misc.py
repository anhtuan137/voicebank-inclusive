"""Misc domain — tổng đài/callback (§7.4), branch, vcb-pay, beneficiaries/contacts,
và các endpoint DEMO (demo-reset, activate-all) — §9.3."""
from __future__ import annotations

import random
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from mockapi import rules
from mockapi.api_common import customer_or_404, require_demo
from mockapi.store import store

router = APIRouter(tags=["misc"])


# ── Beneficiaries / Contacts ──────────────────────────────────────────────────
@router.get("/beneficiaries")
def beneficiaries(phone: str) -> dict:
    key = store.resolve_phone_key(phone)
    return {"beneficiaries": [b for b in store.beneficiaries if b["phone"] == key]}


@router.get("/contacts")
def contacts(phone: str) -> dict:
    key = store.resolve_phone_key(phone)
    return {"contacts": [c for c in store.contacts if c["owner_phone"] == key]}


# ── Branch / VCB Pay ──────────────────────────────────────────────────────────
@router.get("/branch/nearest")
def nearest_branch(q: str = "") -> dict:
    return {
        "branch": {
            "name": "VCB Chi nhánh Sở giao dịch",
            "address": "31-33 Ngô Quyền, Hoàn Kiếm, Hà Nội",
            "distance_km": 1.2,
            "open_hours": f"{rules.AGENT_HOUR_OPEN}h–{rules.AGENT_HOUR_CLOSE}h",
        }
    }


@router.get("/vcb-pay/wallet-balance")
def wallet_balance(phone: str) -> dict:
    c = customer_or_404(phone)
    return {"vcb_pay_balance": c["vcb_pay_balance"]}


@router.get("/vcb-pay/usage-guide")
def usage_guide() -> dict:
    return {"guide": "VCB Pay: ví điện tử tích hợp — thanh toán QR, nạp tiền điện thoại, mua vé. Số dư ví tách biệt với tài khoản thanh toán."}


# ── Callback / tổng đài viên (BR-AGT-01/02) ───────────────────────────────────
class CallbackBody(BaseModel):
    phone: str
    time: str = ""


@router.post("/callback")
def request_callback(body: CallbackBody) -> dict:
    c = customer_or_404(body.phone)
    hour = datetime.now().hour
    agent_open = rules.is_agent_open(hour)  # BR-AGT-01
    available = agent_open and random.random() < rules.AGENT_AVAILABLE_PROB  # BR-AGT-02
    cb = store.add_callback({
        "phone_last4": c["phone_last4"],  # BR-SEC-02: chỉ 4 số cuối
        "requested_time": body.time,
        "status": "connected" if available else "scheduled",
        "agent_open": agent_open,
    })
    return {
        "callback_id": cb["id"],
        "status": cb["status"],
        "agent_open": agent_open,
        "message": (
            "Đang kết nối tổng đài viên."
            if available else
            "Tổng đài đang bận hoặc ngoài giờ phục vụ (8h–22h). Đã đặt lịch gọi lại cho bạn."
        ),
    }


@router.get("/callbacks")
def list_callbacks() -> dict:
    return {"callbacks": store.callbacks}


# ── DEMO-only (mặc định tắt — §19) ────────────────────────────────────────────
@router.post("/demo-reset", include_in_schema=False)
def demo_reset() -> dict:
    require_demo()
    store.reset()
    return {"reset": True}


@router.post("/api/activate-all-cards", include_in_schema=False)
def activate_all_cards() -> dict:
    require_demo()
    n = 0
    for c in store.list_customers():
        c["card_status"] = "active"
        n += 1
    return {"activated": n}


@router.post("/api/activate-all-services", include_in_schema=False)
def activate_all_services() -> dict:
    require_demo()
    n = 0
    for c in store.list_customers():
        c["sms_banking_active"] = True
        c["internet_banking_active"] = True
        n += 1
    return {"activated": n}
