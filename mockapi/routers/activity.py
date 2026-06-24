"""User-action ingest — đồng bộ thao tác từ frontend (/user) vào DASHBOARD.

Mỗi thao tác hoàn tất trên Trợ lý An (chuyển tiền, khoá thẻ, báo ATM nuốt thẻ…)
POST về đây và được ghi thẳng vào các bảng mà console /dashboard đang đọc:

  • conversations + conversation_messages → tab "Giám sát hội thoại"
  • tickets (+ ticket_messages)           → tab "Ticket hỗ trợ"  (luồng hỗ trợ/gian lận)
  • escalations                           → hàng đợi chờ nhân viên (tab Giám sát)

Nhờ đó admin thấy ngay hành động demo của khách, KHÔNG cần tab riêng.
Yêu cầu DB_SOURCE=postgres (các tab này đọc trực tiếp từ Postgres). Ở chế độ
json, endpoint trả {"stored": false} để frontend bỏ qua mà không lỗi.

POST /api/v1/dashboard/user-action
"""
from __future__ import annotations

import secrets
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from pydantic import BaseModel

from mockapi.database import get_conn, is_postgres

router = APIRouter(prefix="/api/v1/dashboard", tags=["ingest"])

_DEMO_PHONE = "0901 234 079"


def _vn_now() -> str:
    return datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).strftime("%H:%M")


def _rid() -> str:
    """Hậu tố ngẫu nhiên 5 ký tự — tránh trùng khoá khi nhiều thao tác cùng giây."""
    return secrets.token_hex(3)[:5].upper()


class UserAction(BaseModel):
    op: str                       # "Chuyển tiền" | "Khoá thẻ" | …
    kind: str = "transaction"     # "transaction" | "support" | "fraud"
    customer: str = "Đỗ Anh Tuấn"
    phone: str | None = None
    amount: int | None = None     # VND (int)
    status: str = "Thành công"    # mô tả nghiệp vụ
    detail: str = ""
    code: str | None = None       # mã hoá đơn / phiếu
    user_said: str | None = None  # câu người dùng nói (cho transcript)


def _money(n: int | None) -> str:
    return f"{n:,.0f}đ".replace(",", ".") if n is not None else ""


@router.post("/user-action", status_code=201)
def ingest_user_action(body: UserAction) -> dict:
    if not is_postgres():
        return {"stored": False, "reason": "DB_SOURCE=json"}

    now = datetime.now()
    conv_id = f"VB-{now.strftime('%y%m%d')}-{_rid()}"
    phone = body.phone or _DEMO_PHONE

    # Map nghiệp vụ → thuộc tính hiển thị trên dashboard
    risk = {"fraud": "high", "support": "medium"}.get(body.kind, "low")
    conv_status = "escalated" if body.kind in ("support", "fraud") else "bot"
    if body.kind == "fraud":
        mood, mood_score, mood_pct, mood_cls = "Lo lắng", "-0.4", 38, "orange"
    else:
        mood, mood_score, mood_pct, mood_cls = "Hài lòng", "+0.6", 84, "green"

    said = body.user_said or f"Tôi muốn {body.op.lower()}."
    an_reply = body.detail or body.status
    if body.amount is not None:
        an_reply = f"{an_reply} · {_money(body.amount)}".strip(" ·")

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO conversations
              (id, duration, customer, phone, channel, status, risk,
               intent, intent_conf, mood, mood_score, mood_pct)
            VALUES (%s,%s,%s,%s,'bot',%s,%s,%s,%s,%s,%s,%s)
            """,
            (conv_id, "0m 48s", body.customer, phone, conv_status, risk,
             body.op, 96, mood, mood_score, mood_pct),
        )
        for seq, (who, name, content) in enumerate([
            ("kh", body.customer, said),
            ("an", "Trợ lý An", an_reply),
        ]):
            conn.execute(
                """
                INSERT INTO conversation_messages
                  (conversation_id, seq, who, name, sent_at, content, mood, mood_cls)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (conv_id, seq, who, name, _vn_now(), content,
                 mood if who == "kh" else None, mood_cls if who == "kh" else None),
            )

        result: dict = {"stored": True, "conversation_id": conv_id}

        # Luồng hỗ trợ / gian lận → tạo thêm ticket + escalation
        if body.kind in ("support", "fraud"):
            ticket_id = f"TK-{now.year}-{_rid()}"
            priority, pcls = ("Cao", "red") if body.kind == "fraud" else ("Trung bình", "orange")
            summary = body.detail or body.op
            conn.execute(
                """
                INSERT INTO tickets
                  (id, subject, status, customer, phone, channel,
                   priority, priority_cls, sla, sla_cls, ai_summary, ai_conf,
                   sla_state, sla_total, sla_pct, source_conv_id)
                VALUES (%s,%s,'new',%s,%s,'Trợ lý An', %s,%s,'1h 00m','green',%s,%s,
                        'Còn 1h 00m','1h 00m',5, %s)
                """,
                (ticket_id, body.op, body.customer, phone,
                 priority, pcls, summary, 95, conv_id),
            )
            conn.execute(
                """
                INSERT INTO ticket_messages (ticket_id, seq, who, name, sent_at, content)
                VALUES (%s, 0, 'kh', %s, %s, %s)
                """,
                (ticket_id, body.customer, _vn_now(), said),
            )
            conn.execute(
                """
                INSERT INTO escalations
                  (code, customer, reason, priority, priority_cls, status, status_cls, wait)
                VALUES (%s,%s,%s,%s,%s,'Đang chờ','orange','Vừa xong')
                """,
                (ticket_id, body.customer, body.op, priority, pcls),
            )
            result["ticket_id"] = ticket_id

    return result
