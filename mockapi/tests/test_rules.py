"""Unit test cho quy tắc nghiệp vụ §7 (BR-AUTH / TRF / SAV / AGT / SVC / KYC).

Mỗi test gắn với một mã BR để dễ truy vết. Giá trị phải khớp CHÍNH XÁC §7.
"""
import pytest

from mockapi import rules


# ── §7.1 Auth ─────────────────────────────────────────────────────────────────
def test_br_auth_01_otp_six_digits():
    assert rules.OTP_LENGTH == 6
    assert rules.is_valid_otp_format("123456")
    assert not rules.is_valid_otp_format("12345")
    assert not rules.is_valid_otp_format("1234567")
    assert not rules.is_valid_otp_format("12a456")


def test_br_auth_02_otp_expires_5_min():
    assert rules.OTP_TTL_SECONDS == 5 * 60
    assert not rules.is_otp_expired(issued_at_epoch=1000.0, now_epoch=1000.0 + 299)
    assert rules.is_otp_expired(issued_at_epoch=1000.0, now_epoch=1000.0 + 301)


def test_br_auth_03_04_08_lock_at_5_attempts():
    assert rules.MAX_PIN_ATTEMPTS == 5
    assert rules.MAX_OTP_ATTEMPTS == 5
    assert not rules.should_lock_pin(4)
    assert rules.should_lock_pin(5)
    assert not rules.should_lock_otp(4)
    assert rules.should_lock_otp(5)


def test_br_auth_05_lock_duration_15_min():
    assert rules.LOCK_DURATION_SECONDS == 15 * 60
    now = 10_000.0
    assert rules.is_lock_active(now + 1, now)
    assert not rules.is_lock_active(now - 1, now)
    assert not rules.is_lock_active(None, now)


# ── §7.2 Transfer ─────────────────────────────────────────────────────────────
def test_br_trf_01_min_amount():
    assert rules.MIN_TRANSFER_AMOUNT == 5_000
    with pytest.raises(rules.RuleError) as e:
        rules.validate_transfer(amount=4_999, note="", recipient_account="123456", balance=10_000_000, source_locked=False)
    assert e.value.code == "MIN_AMOUNT"


def test_br_trf_02_note_max_210():
    assert rules.MAX_NOTE_LENGTH == 210
    with pytest.raises(rules.RuleError) as e:
        rules.validate_transfer(amount=10_000, note="x" * 211, recipient_account="123456", balance=10_000_000, source_locked=False)
    assert e.value.code == "NOTE_TOO_LONG"


def test_br_trf_03_insufficient_balance():
    with pytest.raises(rules.RuleError) as e:
        rules.validate_transfer(amount=2_000_000, note="", recipient_account="123456", balance=1_000_000, source_locked=False)
    assert e.value.code == "INSUFFICIENT"


def test_br_trf_04_source_locked():
    with pytest.raises(rules.RuleError) as e:
        rules.validate_transfer(amount=10_000, note="", recipient_account="123456", balance=10_000_000, source_locked=True)
    assert e.value.code == "SOURCE_LOCKED"


def test_br_trf_05_recipient_min_6_digits():
    assert rules.MIN_RECIPIENT_ACCOUNT_DIGITS == 6
    with pytest.raises(rules.RuleError) as e:
        rules.validate_transfer(amount=10_000, note="", recipient_account="12345", balance=10_000_000, source_locked=False)
    assert e.value.code == "BAD_ACCOUNT"


def test_br_trf_07_face_kyc_thresholds():
    assert rules.KYC_PER_TXN_THRESHOLD == 10_000_000
    assert rules.KYC_DAILY_THRESHOLD == 20_000_000
    # >10tr/giao dịch
    assert rules.requires_face_kyc(10_000_001, 0)
    assert not rules.requires_face_kyc(10_000_000, 0)
    # tổng >20tr/ngày dù mỗi lần ≤10tr
    assert rules.requires_face_kyc(9_000_000, 15_000_000)
    assert not rules.requires_face_kyc(5_000_000, 15_000_000)


def test_br_trf_07_status_ready_vs_pending_kyc():
    assert rules.validate_transfer(amount=5_000_000, note="", recipient_account="123456", balance=50_000_000, source_locked=False) == "ready"
    assert rules.validate_transfer(amount=15_000_000, note="", recipient_account="123456", balance=50_000_000, source_locked=False) == "pending_kyc"


# ── §7.3 Savings ──────────────────────────────────────────────────────────────
def test_br_sav_01_min_deposit():
    assert rules.MIN_SAVINGS_DEPOSIT == 1_000_000
    with pytest.raises(rules.RuleError) as e:
        rules.validate_savings_open(amount=999_999, balance=10_000_000, source_locked=False)
    assert e.value.code == "MIN_DEPOSIT"


def test_br_sav_02_auto_deposit_goal_only_and_min():
    assert rules.MIN_AUTO_DEPOSIT == 200_000
    # gửi góp trên sổ flexible → không cho
    with pytest.raises(rules.RuleError) as e:
        rules.validate_savings_open(amount=2_000_000, balance=10_000_000, source_locked=False, account_type="flexible", auto_deposit=300_000)
    assert e.value.code == "AUTO_NOT_ALLOWED"
    # gửi góp sổ goal nhưng < 200k → từ chối
    with pytest.raises(rules.RuleError) as e:
        rules.validate_savings_open(amount=2_000_000, balance=10_000_000, source_locked=False, account_type="goal", auto_deposit=199_999)
    assert e.value.code == "MIN_AUTO"
    # hợp lệ
    rules.validate_savings_open(amount=2_000_000, balance=10_000_000, source_locked=False, account_type="goal", auto_deposit=200_000)


def test_br_sav_04_simple_interest_formula():
    # gốc × (rate/100) × (term/12)
    assert rules.simple_interest(10_000_000, 6.0, 12) == 600_000
    assert rules.simple_interest(10_000_000, 6.0, 6) == 300_000
    assert rules.maturity_amount(10_000_000, 6.0, 6) == 10_300_000
    assert isinstance(rules.simple_interest(1_000_000, 6.2, 6), int)  # int VND, không float


def test_br_sav_05_locked_or_insufficient():
    with pytest.raises(rules.RuleError) as e:
        rules.validate_savings_open(amount=2_000_000, balance=10_000_000, source_locked=True)
    assert e.value.code == "SOURCE_LOCKED"
    with pytest.raises(rules.RuleError) as e:
        rules.validate_savings_open(amount=20_000_000, balance=10_000_000, source_locked=False)
    assert e.value.code == "INSUFFICIENT"


def test_br_sav_07_default_maturity_option():
    assert rules.DEFAULT_MATURITY_OPTION == "principal_interest_to_checking"


# ── §7.4 Agent / Service / KYC ────────────────────────────────────────────────
def test_br_agt_01_agent_hours_8_to_22():
    assert rules.AGENT_HOUR_OPEN == 8 and rules.AGENT_HOUR_CLOSE == 22
    assert not rules.is_agent_open(7)
    assert rules.is_agent_open(8)
    assert rules.is_agent_open(21)
    assert not rules.is_agent_open(22)


def test_br_agt_02_availability_prob():
    assert rules.AGENT_AVAILABLE_PROB == 0.8


def test_br_idle_01_values():
    assert rules.IDLE_TIMEOUT_SECONDS == 20
    assert rules.IDLE_MAX_REPROMPTS == 2


def test_br_svc_01_valid_services_only():
    assert rules.VALID_SERVICES == ("SMS Banking", "Internet Banking")
    assert rules.normalize_service_name("sms banking") == "SMS Banking"
    assert rules.normalize_service_name("Internet Banking") == "Internet Banking"
    assert rules.normalize_service_name("Mobile Banking") is None


def test_br_kyc_01_two_steps():
    assert rules.KYC_STEPS == ("normal", "liveness")
    assert rules.kyc_passed(["normal", "liveness"])
    assert not rules.kyc_passed(["normal"])
    assert not rules.kyc_passed(["liveness"])
