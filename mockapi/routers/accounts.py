"""Account domain — customers, card, service, transactions, KYC (§7.4 BR-SVC/SEC/KYC)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mockapi import rules
from mockapi.api_common import customer_or_404, public_customer
from mockapi.store import store

router = APIRouter(tags=["accounts"])


# ── Customers ─────────────────────────────────────────────────────────────────
@router.get("/customers")
def list_customers() -> dict:
    return {"customers": [public_customer(c) for c in store.list_customers()]}


@router.get("/customers/{phone}")
def get_customer(phone: str) -> dict:
    return public_customer(customer_or_404(phone))


# ── Card (§8: active ↔ locked, active → temp_locked) ──────────────────────────
class PhoneBody(BaseModel):
    phone: str


@router.get("/card/status")
def card_status(phone: str) -> dict:
    c = customer_or_404(phone)
    return {"card_last4": c["card_last4"], "card_status": c["card_status"]}


@router.post("/card/lock")
def card_lock(body: PhoneBody) -> dict:
    c = customer_or_404(body.phone)
    c["card_status"] = "locked"
    return {"card_last4": c["card_last4"], "card_status": "locked"}


@router.post("/card/unlock")
def card_unlock(body: PhoneBody) -> dict:
    c = customer_or_404(body.phone)
    c["card_status"] = "active"
    return {"card_last4": c["card_last4"], "card_status": "active"}


@router.post("/card/temp-lock")
def card_temp_lock(body: PhoneBody) -> dict:
    """ATM nuốt thẻ → tạm khóa (§8)."""
    c = customer_or_404(body.phone)
    c["card_status"] = "temp_locked"
    return {"card_last4": c["card_last4"], "card_status": "temp_locked"}


# ── Service (BR-SVC-01, BR-SEC-01) ────────────────────────────────────────────
class ServiceBody(BaseModel):
    phone: str
    service: str  # BR-SEC-01: KHÔNG truyền số điện thoại làm tham số khóa dịch vụ


_SERVICE_FIELD = {"SMS Banking": "sms_banking_active", "Internet Banking": "internet_banking_active"}


@router.get("/service/status")
def service_status(phone: str) -> dict:
    c = customer_or_404(phone)
    return {
        "sms_banking_active": c["sms_banking_active"],
        "internet_banking_active": c["internet_banking_active"],
    }


def _set_service(body: ServiceBody, active: bool) -> dict:
    c = customer_or_404(body.phone)
    name = rules.normalize_service_name(body.service)
    if not name:  # BR-SVC-01
        raise HTTPException(status_code=400, detail={
            "code": "BAD_SERVICE",
            "message": f"Dịch vụ hợp lệ: {', '.join(rules.VALID_SERVICES)}.",
        })
    c[_SERVICE_FIELD[name]] = active
    return {"service": name, "active": active}


@router.post("/service/lock")
def service_lock(body: ServiceBody) -> dict:
    return _set_service(body, active=False)


@router.post("/service/unlock")
def service_unlock(body: ServiceBody) -> dict:
    return _set_service(body, active=True)


# ── Transactions ──────────────────────────────────────────────────────────────
@router.get("/transactions")
def list_transactions(phone: str) -> dict:
    c = customer_or_404(phone)
    return {"transactions": store.transactions_for(c["card_last4"])}


@router.get("/transactions/{txn_id}")
def get_transaction(txn_id: str) -> dict:
    txn = next((t for t in store.transactions if t["id"] == txn_id), None)
    if not txn:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    return txn


# ── KYC sinh trắc (BR-KYC-01: 2 bước normal + liveness) ───────────────────────
class KycBody(BaseModel):
    phone: str
    steps: list[str] = []
    challenge_id: str | None = None


@router.post("/kyc/biometric/verify")
def kyc_verify(body: KycBody) -> dict:
    customer_or_404(body.phone)
    passed = rules.kyc_passed(body.steps)  # BR-KYC-01: cần đủ normal + liveness
    # Đạt + có challenge chuyển tiền → đánh dấu challenge đã xác thực (mở khóa execute).
    if passed and body.challenge_id and body.challenge_id in store.transfer_challenges:
        store.transfer_challenges[body.challenge_id]["verified"] = True
    return {
        "verified": passed,
        "required_steps": list(rules.KYC_STEPS),
        "challenge_id": body.challenge_id,
    }
