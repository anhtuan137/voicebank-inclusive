"""In-memory Mock Bank Core store (Phase 1).

Nguồn seed là `db/database.json` + `db/savings_data.json`. Đây là *working store*
cho lõi nghiệp vụ (auth/card/transfer/savings…): mọi thay đổi (số dư, trạng thái
thẻ, bộ đếm sai PIN/OTP…) diễn ra trong bộ nhớ và có thể `reset()` về seed —
phù hợp với một mock core phục vụ demo & unit test xác định.

Dual-backend (§10): với `DB_SOURCE=postgres`, danh sách khách hàng được seed vào
bảng `bank_customers` (nếu rỗng) rồi nạp từ Postgres; lỗi Postgres → fallback JSON.
Tham chiếu (banks, biểu lãi suất) là dữ liệu chỉ-đọc, nạp từ JSON ở cả hai chế độ.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

from mockapi.database import get_conn, is_postgres

_DB_DIR = Path(__file__).parent.parent / "db"

# Trường runtime gắn thêm vào mỗi customer (không có trong seed).
_RUNTIME_DEFAULTS: dict[str, Any] = {
    "pin_attempts": 0,
    "otp_attempts": 0,
    "pin_locked_until": None,
    "otp_locked_until": None,
    "pending_otp": None,        # {"code": "123456", "issued_at": epoch}
}


def _load_seed(name: str) -> dict:
    with (_DB_DIR / f"{name}.json").open(encoding="utf-8") as f:
        return json.load(f)


class Store:
    """Singleton giữ trạng thái lõi ngân hàng trong bộ nhớ."""

    def __init__(self) -> None:
        self.reset()

    # ── Nạp / reset ───────────────────────────────────────────────────────────
    def reset(self) -> None:
        """Nạp lại toàn bộ trạng thái từ seed JSON (dùng cho demo-reset & tests)."""
        db = _load_seed("database")
        sv = _load_seed("savings_data")

        self.banks: list[dict] = list(db.get("banks", []))
        self.interest_rates: list[dict] = list(sv.get("interest_rates", []))
        self.beneficiaries: list[dict] = [dict(b) for b in db.get("beneficiaries", [])]
        self.contacts: list[dict] = [dict(c) for c in db.get("contacts", [])]
        self.transactions: list[dict] = [dict(t) for t in db.get("transactions", [])]
        self.savings: list[dict] = [dict(s) for s in sv.get("savings_accounts", [])]
        self.callbacks: list[dict] = []
        self._daily_transfer: dict[str, int] = {}  # f"{phone}:{date}" -> tổng đã chuyển
        self.transfer_challenges: dict[str, dict] = {}  # challenge_id -> {phone, amount, verified}
        self.executed_transfers: dict[str, dict] = {}   # idempotency_key -> kết quả (chạy 1 lần — §8)
        self._seq = 1000

        customers = self._load_customers(db.get("customers", []))
        self.customers: dict[str, dict] = {}
        for c in customers:
            c = dict(c)
            for k, v in _RUNTIME_DEFAULTS.items():
                c.setdefault(k, v.copy() if isinstance(v, dict) else v)
            self.customers[c["registered_phone"]] = c

    def _load_customers(self, seed_customers: list[dict]) -> list[dict]:
        """JSON: trả seed. Postgres: seed bảng nếu rỗng rồi nạp; lỗi → fallback seed."""
        if not is_postgres():
            return seed_customers
        try:
            with get_conn() as conn:
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS bank_customers ("
                    "registered_phone TEXT PRIMARY KEY, data JSONB NOT NULL)"
                )
                row = conn.execute("SELECT count(*) AS n FROM bank_customers").fetchone()
                if row and row["n"] == 0:
                    for c in seed_customers:
                        conn.execute(
                            "INSERT INTO bank_customers(registered_phone, data) VALUES (%s, %s) "
                            "ON CONFLICT (registered_phone) DO NOTHING",
                            (c["registered_phone"], json.dumps(c)),
                        )
                rows = conn.execute("SELECT data FROM bank_customers").fetchall()
                return [r["data"] for r in rows] or seed_customers
        except Exception:
            # Spec §10: fallback JSON khi Postgres lỗi.
            return seed_customers

    # ── Khách hàng ─────────────────────────────────────────────────────────────
    def resolve_phone_key(self, phone: str) -> str | None:
        """Khớp số điện thoại đầy đủ hoặc 4 số cuối (§10)."""
        if not phone:
            return None
        if phone in self.customers:
            return phone
        digits = re.sub(r"\D", "", phone)
        last4 = digits[-4:]
        matches = [p for p, c in self.customers.items() if c["phone_last4"] == last4]
        return matches[0] if len(matches) == 1 else None

    def get_customer(self, phone: str) -> dict | None:
        key = self.resolve_phone_key(phone)
        return self.customers.get(key) if key else None

    def list_customers(self) -> list[dict]:
        return list(self.customers.values())

    # ── Tham chiếu ngân hàng & lãi suất ─────────────────────────────────────────
    def get_bank(self, bank_code: str) -> dict | None:
        return next((b for b in self.banks if b["bank_code"] == bank_code), None)

    def rate_for_term(self, term_months: int) -> float | None:
        r = next((x for x in self.interest_rates if x["term_months"] == term_months), None)
        return r["rate"] if r else None

    # ── Giao dịch ───────────────────────────────────────────────────────────────
    def transactions_for(self, card_last4: str) -> list[dict]:
        return [t for t in self.transactions if t["card_last4"] == card_last4]

    def add_transaction(self, txn: dict) -> dict:
        txn = {"id": self.next_id("t"), **txn}
        self.transactions.insert(0, txn)
        return txn

    # ── Hạn mức ngày (BR-TRF-07) ────────────────────────────────────────────────
    def daily_transfer_total(self, phone: str, date: str) -> int:
        return self._daily_transfer.get(f"{phone}:{date}", 0)

    def add_daily_transfer(self, phone: str, date: str, amount: int) -> None:
        self._daily_transfer[f"{phone}:{date}"] = self.daily_transfer_total(phone, date) + amount

    # ── Tiết kiệm ───────────────────────────────────────────────────────────────
    def savings_for(self, phone: str) -> list[dict]:
        key = self.resolve_phone_key(phone)
        return [s for s in self.savings if s["owner_phone"] == key]

    def get_savings(self, sid: str) -> dict | None:
        return next((s for s in self.savings if s["id"] == sid), None)

    def add_savings(self, acc: dict) -> dict:
        acc = {"id": self.next_id("s"), **acc}
        self.savings.append(acc)
        return acc

    # ── Callback (BR-AGT) ───────────────────────────────────────────────────────
    def add_callback(self, cb: dict) -> dict:
        cb = {"id": self.next_id("cb"), **cb}
        self.callbacks.append(cb)
        return cb

    # ── Tiện ích ────────────────────────────────────────────────────────────────
    def next_id(self, prefix: str) -> str:
        self._seq += 1
        return f"{prefix}{self._seq}"

    @staticmethod
    def now() -> float:
        return time.time()


# Singleton dùng chung cho mọi router.
store = Store()
