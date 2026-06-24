"""Integration test cho Mock Bank Core endpoints (§9.3) qua TestClient.

Mỗi test reset store về seed để xác định và độc lập.
"""
import pytest
from fastapi.testclient import TestClient

from mockapi.server import app
from mockapi.store import store

client = TestClient(app)
PHONE = "0790123456"  # Đỗ Anh Tuấn — balance 14.65tr, pin 123456, otp_secret 111111
BALANCE = 14_650_000


@pytest.fixture(autouse=True)
def _reset_store():
    store.reset()
    yield
    store.reset()


# ── Auth ──────────────────────────────────────────────────────────────────────
def test_verify_pin_success_and_wrong():
    assert client.post("/auth/verify-pin", json={"phone": PHONE, "pin": "123456"}).json()["verified"] is True
    r = client.post("/auth/verify-pin", json={"phone": PHONE, "pin": "000000"}).json()
    assert r["verified"] is False and r["attempts"] == 1


def test_pin_lock_after_5_failed_attempts():
    # BR-AUTH-03/08: sai 5 lần → khóa + escalate
    for i in range(5):
        r = client.post("/auth/verify-pin", json={"phone": PHONE, "pin": "000000"}).json()
    assert r["locked"] is True and r["escalate_to_agent"] is True
    # lần kế tiếp bị chặn 423
    blocked = client.post("/auth/verify-pin", json={"phone": PHONE, "pin": "123456"})
    assert blocked.status_code == 423


def test_otp_flow_and_format():
    client.post("/auth/send-otp", json={"phone": PHONE})
    # sai định dạng → 400
    assert client.post("/auth/verify-otp", json={"phone": PHONE, "otp": "12"}).status_code == 400
    # đúng mã (otp_secret seed = 111111)
    assert client.post("/auth/verify-otp", json={"phone": PHONE, "otp": "111111"}).json()["verified"] is True


def test_br_auth_07_pin_success_resets_otp_lock():
    # khóa OTP trước
    client.post("/auth/send-otp", json={"phone": PHONE})
    for _ in range(5):
        client.post("/auth/verify-otp", json={"phone": PHONE, "otp": "000000"})
    assert client.post("/auth/verify-otp", json={"phone": PHONE, "otp": "111111"}).status_code == 423
    # verify-pin thành công reset khóa OTP
    client.post("/auth/verify-pin", json={"phone": PHONE, "pin": "123456"})
    client.post("/auth/send-otp", json={"phone": PHONE})
    assert client.post("/auth/verify-otp", json={"phone": PHONE, "otp": "111111"}).json()["verified"] is True


# ── Card / Service ────────────────────────────────────────────────────────────
def test_card_lock_unlock():
    assert client.post("/card/lock", json={"phone": PHONE}).json()["card_status"] == "locked"
    assert client.post("/card/unlock", json={"phone": PHONE}).json()["card_status"] == "active"
    assert client.post("/card/temp-lock", json={"phone": PHONE}).json()["card_status"] == "temp_locked"


def test_service_lock_validates_name():
    assert client.post("/service/lock", json={"phone": PHONE, "service": "SMS Banking"}).json()["active"] is False
    assert client.post("/service/lock", json={"phone": PHONE, "service": "Mobile Banking"}).status_code == 400


# ── Transfer ──────────────────────────────────────────────────────────────────
def test_transfer_lookup_rejects_short_account():
    assert client.post("/transfer/lookup", json={"bank_code": "VCB", "account_number": "123"}).status_code == 422


def test_transfer_ready_executes_and_debits():
    body = {"phone": PHONE, "amount": 2_000_000, "recipient_account": "0011000999888", "bank_code": "VCB", "note": "an trua"}
    assert client.post("/transfer/verify", json=body).json()["status"] == "ready"
    r = client.post("/transfer/execute", json=body).json()
    assert r["status"] == "executed"
    assert r["balance"] == BALANCE - 2_000_000


def test_transfer_large_requires_kyc():
    # 12tr > 10tr/giao dịch → cần eKYC (vẫn ≤ số dư 14.65tr để không vướng INSUFFICIENT trước)
    body = {"phone": PHONE, "amount": 12_000_000, "recipient_account": "0011000999888", "bank_code": "VCB"}
    v = client.post("/transfer/verify", json=body).json()
    assert v["status"] == "pending_kyc" and v["requires_face_kyc"] is True
    # execute không có challenge đã verify → 403
    assert client.post("/transfer/execute", json=body).status_code == 403
    # xác thực challenge rồi execute
    chal = v["challenge_id"]
    store.transfer_challenges[chal]["verified"] = True
    r = client.post("/transfer/execute", json={**body, "challenge_id": chal})
    assert r.status_code == 200 and r.json()["status"] == "executed"


def test_transfer_idempotency_executes_once():
    body = {"phone": PHONE, "amount": 1_000_000, "recipient_account": "0011000999888", "idempotency_key": "k1"}
    r1 = client.post("/transfer/execute", json=body).json()
    r2 = client.post("/transfer/execute", json=body).json()
    assert r1 == r2  # chạy 1 lần duy nhất (§8)
    assert store.get_customer(PHONE)["account_balance"] == BALANCE - 1_000_000


# ── Savings ───────────────────────────────────────────────────────────────────
def test_savings_calculate_interest():
    r = client.get("/savings/calculate-interest", params={"principal": 10_000_000, "term_months": 6}).json()
    assert r["rate"] == 6.2
    assert r["interest"] == round(10_000_000 * 0.062 * 0.5)


def test_savings_open_debits_and_min_rule():
    # dưới mức tối thiểu → 400
    assert client.post("/savings/open", json={"phone": PHONE, "amount": 500_000, "term_months": 6}).status_code == 400
    r = client.post("/savings/open", json={"phone": PHONE, "amount": 5_000_000, "term_months": 12}).json()
    assert r["savings"]["status"] == "active" and r["savings"]["rate"] == 7.4
    assert r["balance"] == BALANCE - 5_000_000


def test_savings_freeze_only_active():
    r = client.post("/savings/freeze", json={"id": "s1"}).json()  # s1 active trong seed
    assert r["status"] == "frozen"
    # freeze lần nữa → 409 (không còn active)
    assert client.post("/savings/freeze", json={"id": "s1"}).status_code == 409
    assert client.post("/savings/unfreeze", json={"id": "s1"}).json()["status"] == "active"


# ── Misc / Agent ──────────────────────────────────────────────────────────────
def test_callback_creates_record():
    r = client.post("/callback", json={"phone": PHONE, "time": "14:00"}).json()
    assert r["status"] in {"connected", "scheduled"}
    assert "callback_id" in r


def test_customers_never_leak_pin():
    body = client.get(f"/customers/{PHONE}").json()
    assert "pin" not in body and "otp_secret" not in body
    assert "registered_phone" not in body  # chỉ lộ 4 số cuối
    assert body["phone_last4"] == "3456"


def test_demo_reset_gated_by_feature_flag():
    # FEATURE_DEMO mặc định tắt → 404
    assert client.post("/demo-reset").status_code == 404
