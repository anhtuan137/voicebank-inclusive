"""Auth domain — xác thực PIN/OTP (§7.1, BR-AUTH-01..08)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mockapi import rules
from mockapi.api_common import customer_or_404, require_demo
from mockapi.store import store

router = APIRouter(prefix="/auth", tags=["auth"])


class PinBody(BaseModel):
    phone: str
    pin: str


class PhoneBody(BaseModel):
    phone: str


class OtpBody(BaseModel):
    phone: str
    otp: str


def _clear_pin_lock_if_expired(c: dict) -> None:
    """BR-AUTH-05: tự mở khóa khi hết 15 phút."""
    until = c.get("pin_locked_until")
    if until is not None and not rules.is_lock_active(until, store.now()):
        c["pin_locked_until"] = None
        c["pin_attempts"] = 0


def _clear_otp_lock_if_expired(c: dict) -> None:
    until = c.get("otp_locked_until")
    if until is not None and not rules.is_lock_active(until, store.now()):
        c["otp_locked_until"] = None
        c["otp_attempts"] = 0


@router.post("/verify-pin")
def verify_pin(body: PinBody) -> dict:
    c = customer_or_404(body.phone)
    _clear_pin_lock_if_expired(c)
    if rules.is_lock_active(c.get("pin_locked_until"), store.now()):
        raise HTTPException(status_code=423, detail={
            "code": "ACCOUNT_LOCKED",
            "message": f"Tài khoản đang bị khóa {rules.LOCK_DURATION_SECONDS // 60} phút do nhập sai quá nhiều lần.",
            "escalate_to_agent": True,
        })

    if body.pin == c["pin"]:
        c["pin_attempts"] = 0
        # BR-AUTH-07: xác thực PIN thành công reset bộ đếm/khóa OTP.
        c["otp_attempts"] = 0
        c["otp_locked_until"] = None
        return {"verified": True, "attempts_left": rules.MAX_PIN_ATTEMPTS}

    c["pin_attempts"] = c.get("pin_attempts", 0) + 1
    locked = rules.should_lock_pin(c["pin_attempts"])  # BR-AUTH-03/08
    if locked:
        c["pin_locked_until"] = store.now() + rules.LOCK_DURATION_SECONDS
    return {
        "verified": False,
        "attempts": c["pin_attempts"],
        "attempts_left": max(0, rules.MAX_PIN_ATTEMPTS - c["pin_attempts"]),
        "locked": locked,
        "escalate_to_agent": locked,  # khóa → chuyển tổng đài viên (BR-AUTH-03)
    }


@router.post("/send-otp")
def send_otp(body: PhoneBody) -> dict:
    c = customer_or_404(body.phone)
    # OTP demo lấy từ otp_secret để xác định được; thực tế là mã ngẫu nhiên.
    code = str(c["otp_secret"]).zfill(rules.OTP_LENGTH)[: rules.OTP_LENGTH]
    c["pending_otp"] = {"code": code, "issued_at": store.now()}
    # BR-AUTH-06: KHÔNG reset bộ đếm sai OTP khi gửi mã mới (chống lách).
    return {"sent": True, "ttl_seconds": rules.OTP_TTL_SECONDS, "length": rules.OTP_LENGTH}


@router.post("/verify-otp")
def verify_otp(body: OtpBody) -> dict:
    c = customer_or_404(body.phone)
    _clear_otp_lock_if_expired(c)
    if rules.is_lock_active(c.get("otp_locked_until"), store.now()):
        raise HTTPException(status_code=423, detail={
            "code": "OTP_LOCKED",
            "message": f"Đã khóa OTP {rules.LOCK_DURATION_SECONDS // 60} phút do nhập sai quá nhiều lần.",
        })

    if not rules.is_valid_otp_format(body.otp):
        raise HTTPException(status_code=400, detail={"code": "BAD_OTP_FORMAT", "message": f"OTP gồm {rules.OTP_LENGTH} chữ số."})

    pending = c.get("pending_otp")
    if not pending:
        raise HTTPException(status_code=400, detail={"code": "NO_OTP", "message": "Chưa gửi OTP."})
    if rules.is_otp_expired(pending["issued_at"], store.now()):
        c["pending_otp"] = None
        raise HTTPException(status_code=400, detail={"code": "OTP_EXPIRED", "message": "OTP đã hết hạn, vui lòng gửi lại."})

    if body.otp == pending["code"]:
        c["otp_attempts"] = 0
        c["pending_otp"] = None
        return {"verified": True}

    c["otp_attempts"] = c.get("otp_attempts", 0) + 1
    locked = rules.should_lock_otp(c["otp_attempts"])  # BR-AUTH-04/08
    if locked:
        c["otp_locked_until"] = store.now() + rules.LOCK_DURATION_SECONDS
    return {
        "verified": False,
        "attempts": c["otp_attempts"],
        "attempts_left": max(0, rules.MAX_OTP_ATTEMPTS - c["otp_attempts"]),
        "locked": locked,
    }


@router.post("/reset-attempts")
def reset_attempts(body: PhoneBody) -> dict:
    c = customer_or_404(body.phone)
    c["pin_attempts"] = 0
    c["otp_attempts"] = 0
    c["pin_locked_until"] = None
    c["otp_locked_until"] = None
    return {"reset": True}


# ── DEMO-only ─────────────────────────────────────────────────────────────────
@router.get("/internal/latest-otp", include_in_schema=False)
def latest_otp(phone: str) -> dict:
    """(FEATURE_DEMO) Trả OTP đang chờ để demo offline. Mặc định tắt."""
    require_demo()
    c = customer_or_404(phone)
    pending = c.get("pending_otp")
    return {"otp": pending["code"] if pending else None}
