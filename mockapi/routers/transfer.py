"""Transfer domain — chuyển tiền (§7.2, BR-TRF-01..09)."""
from __future__ import annotations

import re
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mockapi import rules
from mockapi.api_common import customer_or_404
from mockapi.store import store

router = APIRouter(prefix="/transfer", tags=["transfer"])


@router.get("/banks")
def list_banks() -> dict:
    return {"banks": store.banks}


# ── BR-TRF-06: tên người nhận LUÔN do hệ thống tra ────────────────────────────
class LookupBody(BaseModel):
    bank_code: str
    account_number: str


def _lookup_name(bank_code: str, account_number: str) -> str | None:
    digits = rules.recipient_account_digits(account_number)
    if len(digits) < rules.MIN_RECIPIENT_ACCOUNT_DIGITS:  # BR-TRF-05
        return None
    # Khớp danh bạ thụ hưởng nếu có; nếu không, tra được = sinh tên theo STK (mock).
    b = next((x for x in store.beneficiaries
              if x["bank_code"] == bank_code and x["account_number"] == account_number), None)
    if b:
        return b["name"]
    return f"Chủ tài khoản ••{digits[-4:]}"


@router.post("/lookup")
def lookup(body: LookupBody) -> dict:
    if not store.get_bank(body.bank_code):
        raise HTTPException(status_code=400, detail={"code": "BAD_BANK", "message": "Mã ngân hàng không hợp lệ."})
    name = _lookup_name(body.bank_code, body.account_number)
    if not name:  # BR-TRF-06: không tra được → từ chối
        raise HTTPException(status_code=422, detail={"code": "LOOKUP_FAILED", "message": "Không tra được tên người nhận."})
    return {"name": name, "bank_code": body.bank_code, "account_number": body.account_number}


# ── Verify (xác định có cần eKYC không — BR-TRF-07) ───────────────────────────
class VerifyBody(BaseModel):
    phone: str
    amount: int
    recipient_account: str
    bank_code: str = rules.INTERNAL_BANK_CODE
    note: str = ""


def _validate_or_400(c: dict, amount: int, note: str, recipient_account: str) -> str:
    try:
        return rules.validate_transfer(
            amount=amount,
            note=note,
            recipient_account=recipient_account,
            balance=c["account_balance"],
            source_locked=c["card_status"] == "locked",  # BR-TRF-04
            daily_total=store.daily_transfer_total(c["registered_phone"], date.today().isoformat()),
        )
    except rules.RuleError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/verify")
def verify(body: VerifyBody) -> dict:
    c = customer_or_404(body.phone)
    status = _validate_or_400(c, body.amount, body.note, body.recipient_account)
    challenge_id = None
    if status == "pending_kyc":
        challenge_id = store.next_id("chal")
        store.transfer_challenges[challenge_id] = {"phone": c["registered_phone"], "amount": body.amount, "verified": False}
    return {"status": status, "requires_face_kyc": status == "pending_kyc", "challenge_id": challenge_id}


# ── Execute (idempotent — §8: chạy 1 lần duy nhất) ────────────────────────────
class ExecuteBody(BaseModel):
    phone: str
    amount: int
    recipient_account: str
    bank_code: str = rules.INTERNAL_BANK_CODE
    note: str = ""
    recipient_name: str | None = None   # tên người nhận do FE cung cấp (chuyển theo tên)
    challenge_id: str | None = None
    idempotency_key: str | None = None


@router.post("/execute")
def execute(body: ExecuteBody) -> dict:
    if body.idempotency_key and body.idempotency_key in store.executed_transfers:
        return store.executed_transfers[body.idempotency_key]  # idempotency

    c = customer_or_404(body.phone)
    status = _validate_or_400(c, body.amount, body.note, body.recipient_account)

    if status == "pending_kyc":  # BR-TRF-07: cần eKYC khuôn mặt trước
        chal = store.transfer_challenges.get(body.challenge_id or "")
        if not chal or not chal.get("verified"):
            raise HTTPException(status_code=403, detail={
                "code": "KYC_REQUIRED",
                "message": "Giao dịch giá trị lớn cần xác thực khuôn mặt trước khi thực hiện.",
            })

    # Ưu tiên tên người nhận FE truyền (chuyển theo tên); nếu không có thì tra từ STK (BR-TRF-06).
    recipient = body.recipient_name or _lookup_name(body.bank_code, body.recipient_account)
    today = date.today().isoformat()
    c["account_balance"] -= body.amount
    store.add_daily_transfer(c["registered_phone"], today, body.amount)
    txn = store.add_transaction({
        "card_last4": c["card_last4"],
        "date": today,
        "amount": -body.amount,
        "desc": f"Chuyen tien {recipient}",
        "transaction_type": "transfer",
        "category": "Chuyển khoản",
        "destination_account": {"bank_code": body.bank_code, "account_number": body.recipient_account, "name": recipient},
    })
    result = {
        "status": "executed",
        "transaction_id": txn["id"],
        "amount": body.amount,
        "recipient": recipient,
        "balance": c["account_balance"],
    }
    if body.idempotency_key:
        store.executed_transfers[body.idempotency_key] = result
    return result


@router.post("/bank-transfer")
def bank_transfer(body: ExecuteBody) -> dict:
    """Chuyển liên ngân hàng — cùng quy tắc execute (BR-TRF-08: nội bộ = 'VCB')."""
    return execute(body)


# ── Parse QR (BR-TRF-09: QR có amount cố định → không cho sửa) ─────────────────
class QrBody(BaseModel):
    qr: str


@router.post("/parse-qr")
def parse_qr(body: QrBody) -> dict:
    """QR mock dạng 'VCB|account|amount?'. amount có → fixed_amount=True (BR-TRF-09)."""
    parts = body.qr.split("|")
    bank_code = parts[0].strip() if parts and parts[0].strip() else rules.INTERNAL_BANK_CODE
    account_number = parts[1].strip() if len(parts) > 1 else ""
    amount = None
    if len(parts) > 2 and re.fullmatch(r"\d+", parts[2].strip()):
        amount = int(parts[2].strip())
    return {
        "bank_code": bank_code,
        "account_number": account_number,
        "amount": amount,
        "fixed_amount": amount is not None,  # BR-TRF-09
    }
