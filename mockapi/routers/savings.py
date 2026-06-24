"""Savings domain — gửi tiết kiệm (§7.3, BR-SAV-01..08)."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mockapi import rules
from mockapi.api_common import customer_or_404
from mockapi.store import store

router = APIRouter(prefix="/savings", tags=["savings"])


@router.get("/interest-rates")
def interest_rates() -> dict:
    return {"interest_rates": store.interest_rates}


@router.get("/calculate-interest")
def calculate_interest(principal: int, term_months: int) -> dict:
    rate = store.rate_for_term(term_months)
    if rate is None:
        raise HTTPException(status_code=400, detail={"code": "BAD_TERM", "message": "Kỳ hạn không có trong biểu lãi suất."})
    interest = rules.simple_interest(principal, rate, term_months)  # BR-SAV-04
    return {
        "principal": principal,
        "term_months": term_months,
        "rate": rate,  # BR-SAV-03: chỉ lấy từ biểu lãi suất
        "interest": interest,
        "maturity_amount": principal + interest,
    }


@router.get("/list")
def list_savings(phone: str) -> dict:
    customer_or_404(phone)
    return {"savings": store.savings_for(phone)}


class OpenBody(BaseModel):
    phone: str
    amount: int
    term_months: int
    type: str = "flexible"  # flexible | goal
    auto_deposit: int | None = None


def _add_months(d: date, months: int) -> date:
    m = d.month - 1 + months
    return date(d.year + m // 12, m % 12 + 1, min(d.day, 28))


@router.post("/open")
def open_savings(body: OpenBody) -> dict:
    c = customer_or_404(body.phone)
    rate = store.rate_for_term(body.term_months)
    if rate is None:
        raise HTTPException(status_code=400, detail={"code": "BAD_TERM", "message": "Kỳ hạn không có trong biểu lãi suất."})
    try:
        rules.validate_savings_open(
            amount=body.amount,
            balance=c["account_balance"],
            source_locked=c["card_status"] == "locked",
            account_type=body.type,
            auto_deposit=body.auto_deposit,
        )
    except rules.RuleError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})

    c["account_balance"] -= body.amount  # BR-SAV-06: trừ gốc ngay khi mở
    today = date.today()
    acc = store.add_savings({
        "owner_phone": c["registered_phone"],
        "type": body.type,
        "principal": body.amount,
        "term_months": body.term_months,
        "rate": rate,
        "open_date": today.isoformat(),
        "maturity_date": _add_months(today, body.term_months).isoformat(),
        "maturity_option": rules.DEFAULT_MATURITY_OPTION,  # BR-SAV-07
        "status": "active",
        "auto_deposit": body.auto_deposit if body.type == "goal" else None,
    })
    return {
        "savings": acc,
        "interest": rules.simple_interest(body.amount, rate, body.term_months),
        "maturity_amount": rules.maturity_amount(body.amount, rate, body.term_months),
        "balance": c["account_balance"],
    }


class SidBody(BaseModel):
    id: str


@router.post("/freeze")
def freeze(body: SidBody) -> dict:
    acc = store.get_savings(body.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sổ tiết kiệm.")
    if acc["status"] != "active":  # BR-SAV-08: chỉ sổ active mới phong tỏa
        raise HTTPException(status_code=409, detail={"code": "NOT_ACTIVE", "message": "Chỉ sổ đang hoạt động mới phong tỏa được."})
    acc["status"] = "frozen"
    return {"id": acc["id"], "status": "frozen"}


@router.post("/unfreeze")
def unfreeze(body: SidBody) -> dict:
    acc = store.get_savings(body.id)
    if not acc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sổ tiết kiệm.")
    if acc["status"] != "frozen":  # BR-SAV-08: chỉ sổ frozen mới giải tỏa
        raise HTTPException(status_code=409, detail={"code": "NOT_FROZEN", "message": "Chỉ sổ đang phong tỏa mới giải tỏa được."})
    acc["status"] = "active"
    return {"id": acc["id"], "status": "active"}
