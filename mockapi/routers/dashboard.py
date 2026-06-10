"""Dashboard API — cung cấp dữ liệu cho VCB Admin Console.

Endpoints trả về cùng cấu trúc JSON như các file tĩnh trong /data/*.json,
giúp frontend chỉ cần đổi URL mà không đổi logic parsing.

GET /api/v1/dashboard/config
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/monitor
GET /api/v1/dashboard/tickets
GET /api/v1/dashboard/reports
GET /api/v1/dashboard/settings
GET /api/v1/dashboard/notifications

POST /api/v1/dashboard/tickets        — tạo ticket mới
PATCH /api/v1/dashboard/tickets/{id}  — cập nhật status/assignee
POST /api/v1/dashboard/tickets/{id}/messages  — thêm tin nhắn vào thread
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mockapi.database import get_conn, is_postgres, load_json

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _snapshot(section: str) -> Any:
    """Lấy analytics snapshot từ DB (ưu tiên) hoặc JSON file."""
    if is_postgres():
        try:
            with get_conn() as conn:
                row = conn.execute(
                    "SELECT data FROM analytics_snapshots WHERE section = %s",
                    (section,),
                ).fetchone()
                if row:
                    return row["data"]
        except Exception:
            pass
    return load_json(section)


def _vn_now() -> str:
    """Trả về ngày giờ hiện tại theo định dạng Việt Nam."""
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh"))
    return now.strftime("%d/%m/%Y %H:%M")


# ── Static / Snapshot endpoints ───────────────────────────────────────────────

@router.get("/config")
def get_config() -> Any:
    return _snapshot("config")


@router.get("/overview")
def get_overview() -> Any:
    return _snapshot("overview")


@router.get("/reports")
def get_reports() -> Any:
    return _snapshot("reports")


# ── Monitor (live từ DB) ───────────────────────────────────────────────────────

@router.get("/monitor")
def get_monitor() -> Any:
    if not is_postgres():
        return load_json("monitor")

    with get_conn() as conn:
        convs_raw = conn.execute("""
            SELECT c.id, TO_CHAR(c.started_at, 'HH24:MI') AS time,
                   c.duration, c.customer, c.phone, c.channel,
                   c.status, c.risk, c.intent, c.intent_conf AS "intentConf",
                   c.mood, c.mood_score AS "moodScore", c.mood_pct AS "moodPct"
            FROM conversations c
            ORDER BY c.started_at DESC
            LIMIT 50
        """).fetchall()

        # Lấy transcript cho mỗi cuộc hội thoại
        conversations = []
        for c in convs_raw:
            msgs = conn.execute("""
                SELECT who, name, sent_at AS time, content AS text, mood, mood_cls AS "moodCls"
                FROM conversation_messages
                WHERE conversation_id = %s
                ORDER BY seq
            """, (c["id"],)).fetchall()
            conversations.append({**c, "channel": "bot", "transcript": list(msgs)})

        escalations = conn.execute("""
            SELECT code, customer, reason, priority, priority_cls AS "priorityCls",
                   status, status_cls AS "statusCls", wait
            FROM escalations
            ORDER BY created_at DESC
            LIMIT 20
        """).fetchall()

    # Lấy monitorKpis từ snapshot (chart data)
    snapshot = _snapshot("monitor")
    return {
        "monitorKpis": snapshot.get("monitorKpis", []),
        "conversations": list(conversations),
        "escalations": list(escalations),
    }


# ── Tickets (live từ DB) ───────────────────────────────────────────────────────

@router.get("/tickets")
def get_tickets() -> Any:
    if not is_postgres():
        return load_json("tickets")

    with get_conn() as conn:
        tickets_raw = conn.execute("""
            SELECT id, subject, status, customer, phone,
                   channel, priority, priority_cls AS "priorityCls",
                   sla, sla_note AS "slaNote", sla_cls AS "slaCls",
                   assignee, ai_summary AS "aiSummary", ai_conf AS "aiConf",
                   sla_state, sla_total, sla_pct, sla_deadline,
                   actions,
                   TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') AS "createdAt"
            FROM tickets
            ORDER BY created_at DESC
        """).fetchall()

        tickets = []
        for t in tickets_raw:
            t = dict(t)
            t["slaDetail"] = {
                "state": t.pop("sla_state") or "—",
                "total": t.pop("sla_total") or "—",
                "pct": t.pop("sla_pct") or 0,
                "deadline": t.pop("sla_deadline") or "—",
            }
            # actions lưu dạng JSONB, psycopg3 tự deserialize
            if not isinstance(t["actions"], list):
                t["actions"] = json.loads(t["actions"] or "[]")
            tickets.append(t)

        # Thread messages cho từng ticket
        ticket_threads: dict[str, list] = {}
        all_msgs = conn.execute("""
            SELECT ticket_id, who, name, sent_at AS time, content AS text
            FROM ticket_messages
            ORDER BY ticket_id, seq
        """).fetchall()
        for m in all_msgs:
            m = dict(m)
            tid = m.pop("ticket_id")
            ticket_threads.setdefault(tid, []).append(m)

    snapshot = load_json("tickets")
    return {
        "ticketFilters": snapshot.get("ticketFilters", []),
        "tickets": tickets,
        "ticketWidgets": snapshot.get("ticketWidgets", {}),
        "ticketThreads": ticket_threads,
    }


# ── Notifications (live từ DB) ────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications() -> Any:
    if not is_postgres():
        return load_json("notifications")

    with get_conn() as conn:
        notifs = conn.execute("""
            SELECT icon, title, occurred_at AS time, content AS text
            FROM notifications
            WHERE NOT read
            ORDER BY created_at DESC
            LIMIT 20
        """).fetchall()

    return {"notifications": list(notifs)}


# ── Settings (live từ DB) ─────────────────────────────────────────────────────

@router.get("/settings")
def get_settings() -> Any:
    if not is_postgres():
        return load_json("settings")

    with get_conn() as conn:
        security = conn.execute("""
            SELECT name, description AS desc, enabled AS "on"
            FROM settings_security
            ORDER BY id
        """).fetchall()
        roles = conn.execute("""
            SELECT name, description AS desc, state, cls, enabled AS "on"
            FROM settings_roles
            ORDER BY id
        """).fetchall()

    return {"security": list(security), "roles": list(roles)}


# ── Write endpoints ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject: str
    customer: str
    phone: str | None = None
    channel: str = "Bot"
    priority: str = "Thấp"
    priority_cls: str = "green"
    ai_summary: str | None = None
    ai_conf: int = 90
    source_conv_id: str | None = None


class TicketUpdate(BaseModel):
    status: str | None = None
    assignee: str | None = None
    priority: str | None = None
    priority_cls: str | None = None


class MessageCreate(BaseModel):
    who: str  # kh | nv
    name: str
    content: str


@router.post("/tickets", status_code=201)
def create_ticket(body: TicketCreate) -> dict:
    if not is_postgres():
        raise HTTPException(503, "DB_SOURCE=json: write không khả dụng")

    from datetime import date
    ticket_id = f"TK-{date.today().year}-{int(datetime.now().timestamp()) % 100000:05d}"

    with get_conn() as conn:
        conn.execute("""
            INSERT INTO tickets
              (id, subject, status, customer, phone, channel,
               priority, priority_cls, sla, sla_cls, ai_summary, ai_conf,
               sla_state, sla_total, sla_pct, source_conv_id)
            VALUES (%s,%s,'new',%s,%s,%s, %s,%s,'1h 00m','green',%s,%s,
                    'Còn 1h 00m','1h 00m',5, %s)
        """, (
            ticket_id, body.subject, body.customer, body.phone, body.channel,
            body.priority, body.priority_cls,
            body.ai_summary, body.ai_conf,
            body.source_conv_id,
        ))

    return {"id": ticket_id, "status": "new"}


@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, body: TicketUpdate) -> dict:
    if not is_postgres():
        raise HTTPException(503, "DB_SOURCE=json: write không khả dụng")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Không có trường nào cần cập nhật")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [ticket_id]

    with get_conn() as conn:
        result = conn.execute(
            f"UPDATE tickets SET {set_clause} WHERE id = %s",
            values,
        )
        if result.rowcount == 0:
            raise HTTPException(404, f"Ticket {ticket_id} không tồn tại")

    return {"id": ticket_id, **updates}


@router.post("/tickets/{ticket_id}/messages", status_code=201)
def add_ticket_message(ticket_id: str, body: MessageCreate) -> dict:
    if not is_postgres():
        raise HTTPException(503, "DB_SOURCE=json: write không khả dụng")

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM tickets WHERE id = %s", (ticket_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, f"Ticket {ticket_id} không tồn tại")

        max_seq = conn.execute(
            "SELECT COALESCE(MAX(seq), -1) AS s FROM ticket_messages WHERE ticket_id = %s",
            (ticket_id,),
        ).fetchone()["s"]

        conn.execute("""
            INSERT INTO ticket_messages (ticket_id, seq, who, name, sent_at, content)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (ticket_id, max_seq + 1, body.who, body.name, _vn_now(), body.content))

    return {"ticket_id": ticket_id, "seq": max_seq + 1}


@router.patch("/settings/security/{name}")
def toggle_security(name: str, enabled: bool) -> dict:
    if not is_postgres():
        raise HTTPException(503, "DB_SOURCE=json: write không khả dụng")

    with get_conn() as conn:
        result = conn.execute(
            "UPDATE settings_security SET enabled = %s WHERE name = %s",
            (enabled, name),
        )
        if result.rowcount == 0:
            raise HTTPException(404, f"Cài đặt '{name}' không tồn tại")

    return {"name": name, "enabled": enabled}
