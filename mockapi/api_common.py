"""Tiện ích dùng chung cho các router nghiệp vụ mockapi."""
from __future__ import annotations

import os

from fastapi import HTTPException

from mockapi.store import store

# Trường nhạy cảm KHÔNG bao giờ trả ra API (BR-PIN-01, che PII §15).
_SECRET_FIELDS = {"pin", "otp_secret", "pending_otp"}


def feature_demo_enabled() -> bool:
    return os.getenv("FEATURE_DEMO", "false").lower() in {"1", "true", "yes"}


def require_demo() -> None:
    """Chặn endpoint demo-only khi FEATURE_DEMO tắt (mặc định tắt — §19)."""
    if not feature_demo_enabled():
        raise HTTPException(status_code=404, detail="Not found")


def customer_or_404(phone: str) -> dict:
    c = store.get_customer(phone)
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng.")
    return c


def public_customer(c: dict) -> dict:
    """Bản sao customer đã loại bỏ trường nhạy cảm + chỉ lộ 4 số cuối điện thoại."""
    out = {k: v for k, v in c.items() if k not in _SECRET_FIELDS and k != "registered_phone"}
    out["phone_last4"] = c.get("phone_last4")
    out["pin_locked"] = c.get("pin_locked_until") is not None
    out["otp_locked"] = c.get("otp_locked_until") is not None
    # Không trả mốc thời gian khóa thô; chỉ trả cờ.
    out.pop("pin_locked_until", None)
    out.pop("otp_locked_until", None)
    out.pop("pin_attempts", None)
    out.pop("otp_attempts", None)
    return out
