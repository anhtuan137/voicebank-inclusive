"""Quy tắc nghiệp vụ §7 (AUTHORITATIVE) cho Mock Bank Core.

Mọi giá trị ở đây phải khớp CHÍNH XÁC với §7 của BUILD_SPEC và có unit test
(`mockapi/tests/test_rules.py`). Các hàm trong module này là **thuần** (pure):
không chạm DB, không I/O — để test trực tiếp và tái dùng trong router/flow.

Quy ước:
  • Tiền tệ luôn là int VND (§6) — không dùng float cho số tiền.
  • Lãi suất (rate) là %/năm dạng float.
"""
from __future__ import annotations

import re
from typing import Iterable

# ── 7.1 Xác thực (Authentication) ─────────────────────────────────────────────
OTP_LENGTH = 6                 # BR-AUTH-01
OTP_TTL_SECONDS = 5 * 60       # BR-AUTH-02 — 5 phút
MAX_PIN_ATTEMPTS = 5           # BR-AUTH-03 / BR-AUTH-08
MAX_OTP_ATTEMPTS = 5           # BR-AUTH-04 / BR-AUTH-08
LOCK_DURATION_SECONDS = 15 * 60  # BR-AUTH-03/04/05 — khóa 15 phút

# ── 7.2 Chuyển tiền (Money Transfer) ──────────────────────────────────────────
MIN_TRANSFER_AMOUNT = 5_000          # BR-TRF-01
MAX_NOTE_LENGTH = 210                # BR-TRF-02
MIN_RECIPIENT_ACCOUNT_DIGITS = 6     # BR-TRF-05
KYC_PER_TXN_THRESHOLD = 10_000_000   # BR-TRF-07 — >10tr/giao dịch
KYC_DAILY_THRESHOLD = 20_000_000     # BR-TRF-07 — tổng >20tr/ngày
INTERNAL_BANK_CODE = "VCB"           # BR-TRF-08

# ── 7.3 Gửi tiết kiệm (Savings) ───────────────────────────────────────────────
MIN_SAVINGS_DEPOSIT = 1_000_000      # BR-SAV-01
MIN_AUTO_DEPOSIT = 200_000           # BR-SAV-02 — chỉ sổ gửi góp (goal)
DEFAULT_MATURITY_OPTION = "principal_interest_to_checking"  # BR-SAV-07

# ── 7.4 Tổng đài viên & dịch vụ ───────────────────────────────────────────────
AGENT_HOUR_OPEN = 8                  # BR-AGT-01 — 8h
AGENT_HOUR_CLOSE = 22                # BR-AGT-01 — 22h
AGENT_AVAILABLE_PROB = 0.8           # BR-AGT-02 — 80% rảnh
IDLE_TIMEOUT_SECONDS = 20            # BR-IDLE-01
IDLE_MAX_REPROMPTS = 2               # BR-IDLE-01
VALID_SERVICES = ("SMS Banking", "Internet Banking")  # BR-SVC-01
KYC_STEPS = ("normal", "liveness")   # BR-KYC-01 — 2 bước


# ── Errors ────────────────────────────────────────────────────────────────────
class RuleError(ValueError):
    """Lỗi vi phạm quy tắc nghiệp vụ; `code` là mã ổn định cho client/test."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


# ── 7.1 Auth helpers ──────────────────────────────────────────────────────────

def is_valid_otp_format(otp: str) -> bool:
    """BR-AUTH-01: OTP gồm đúng 6 chữ số."""
    return bool(re.fullmatch(rf"\d{{{OTP_LENGTH}}}", otp or ""))


def is_otp_expired(issued_at_epoch: float, now_epoch: float) -> bool:
    """BR-AUTH-02: OTP hết hạn sau 5 phút kể từ lúc phát."""
    return (now_epoch - issued_at_epoch) > OTP_TTL_SECONDS


def should_lock_pin(failed_attempts: int) -> bool:
    """BR-AUTH-03/08: sai PIN đạt 5 lần → khóa."""
    return failed_attempts >= MAX_PIN_ATTEMPTS


def should_lock_otp(failed_attempts: int) -> bool:
    """BR-AUTH-04/08: sai OTP đạt 5 lần → khóa."""
    return failed_attempts >= MAX_OTP_ATTEMPTS


def is_lock_active(locked_until_epoch: float | None, now_epoch: float) -> bool:
    """BR-AUTH-05: còn trong thời gian khóa 15 phút hay không."""
    return locked_until_epoch is not None and now_epoch < locked_until_epoch


# ── 7.2 Transfer helpers ──────────────────────────────────────────────────────

def recipient_account_digits(account_number: str) -> str:
    return re.sub(r"\D", "", account_number or "")


def requires_face_kyc(amount: int, daily_total: int) -> bool:
    """BR-TRF-07: >10tr/giao dịch HOẶC tổng (đã có + lần này) >20tr/ngày → eKYC."""
    return amount > KYC_PER_TXN_THRESHOLD or (daily_total + amount) > KYC_DAILY_THRESHOLD


def validate_transfer(
    *,
    amount: int,
    note: str,
    recipient_account: str,
    balance: int,
    source_locked: bool,
    daily_total: int = 0,
) -> str:
    """Kiểm tra một lệnh chuyển tiền theo §7.2.

    Trả về trạng thái: `"ready"` (đủ điều kiện thực hiện ngay) hoặc
    `"pending_kyc"` (cần eKYC khuôn mặt trước — BR-TRF-07).
    Ném `RuleError` nếu vi phạm quy tắc.
    """
    if not isinstance(amount, int):
        raise RuleError("AMOUNT_TYPE", "Số tiền phải là số nguyên (VND).")
    if amount < MIN_TRANSFER_AMOUNT:
        raise RuleError("MIN_AMOUNT", f"Số tiền tối thiểu là {MIN_TRANSFER_AMOUNT:,}đ.")
    if len(note or "") > MAX_NOTE_LENGTH:
        raise RuleError("NOTE_TOO_LONG", f"Lời nhắn tối đa {MAX_NOTE_LENGTH} ký tự.")
    if len(recipient_account_digits(recipient_account)) < MIN_RECIPIENT_ACCOUNT_DIGITS:
        raise RuleError("BAD_ACCOUNT", f"Số tài khoản người nhận tối thiểu {MIN_RECIPIENT_ACCOUNT_DIGITS} chữ số.")
    if source_locked:
        raise RuleError("SOURCE_LOCKED", "Tài khoản nguồn đang bị khóa.")  # BR-TRF-04
    if amount > balance:
        raise RuleError("INSUFFICIENT", "Số dư khả dụng không đủ.")  # BR-TRF-03
    return "pending_kyc" if requires_face_kyc(amount, daily_total) else "ready"


# ── 7.3 Savings helpers ───────────────────────────────────────────────────────

def simple_interest(principal: int, rate: float, term_months: int) -> int:
    """BR-SAV-04: lãi đơn = gốc × (rate/100) × (kỳ_hạn/12), làm tròn về int VND."""
    return round(principal * (rate / 100.0) * (term_months / 12.0))


def maturity_amount(principal: int, rate: float, term_months: int) -> int:
    return principal + simple_interest(principal, rate, term_months)


def validate_savings_open(
    *, amount: int, balance: int, source_locked: bool, account_type: str = "flexible",
    auto_deposit: int | None = None,
) -> None:
    """§7.3: kiểm tra mở sổ tiết kiệm. Ném `RuleError` nếu vi phạm."""
    if not isinstance(amount, int):
        raise RuleError("AMOUNT_TYPE", "Số tiền phải là số nguyên (VND).")
    if amount < MIN_SAVINGS_DEPOSIT:
        raise RuleError("MIN_DEPOSIT", f"Số tiền gửi tối thiểu {MIN_SAVINGS_DEPOSIT:,}đ.")  # BR-SAV-01
    if source_locked:
        raise RuleError("SOURCE_LOCKED", "Tài khoản nguồn đang bị khóa.")  # BR-SAV-05
    if amount > balance:
        raise RuleError("INSUFFICIENT", "Số dư không đủ để mở sổ.")  # BR-SAV-05
    if auto_deposit is not None:
        if account_type != "goal":
            raise RuleError("AUTO_NOT_ALLOWED", "Gửi góp tự động chỉ áp dụng cho sổ gửi góp (goal).")  # BR-SAV-02
        if auto_deposit < MIN_AUTO_DEPOSIT:
            raise RuleError("MIN_AUTO", f"Gửi góp tự động tối thiểu {MIN_AUTO_DEPOSIT:,}đ.")  # BR-SAV-02


# ── 7.4 Agent / service helpers ───────────────────────────────────────────────

def is_agent_open(hour: int) -> bool:
    """BR-AGT-01: tổng đài viên phục vụ 8h–22h."""
    return AGENT_HOUR_OPEN <= hour < AGENT_HOUR_CLOSE


def normalize_service_name(name: str) -> str | None:
    """BR-SVC-01: chỉ chấp nhận 'SMS Banking' và 'Internet Banking' (khớp lỏng)."""
    low = (name or "").strip().lower()
    if "sms" in low:
        return "SMS Banking"
    if "internet" in low:
        return "Internet Banking"
    return None


def kyc_passed(steps_done: Iterable[str]) -> bool:
    """BR-KYC-01: phải đủ 2 bước normal + liveness."""
    return set(KYC_STEPS).issubset(set(steps_done))
