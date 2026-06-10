"""
Seed script: đọc dữ liệu từ các file JSON mock và nạp vào PostgreSQL.

Usage:
  python db/seed.py [--reset]

Options:
  --reset   Xóa và nạp lại toàn bộ dữ liệu (mặc định: chỉ insert nếu chưa có)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "application/frontend/public/dashboard/data"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://voicebank:voicebank@localhost:5432/voicebank",
)
RESET = "--reset" in sys.argv


def load(name: str) -> dict:
    path = DATA_DIR / f"{name}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def seed(conn: psycopg.Connection) -> None:
    cur = conn.cursor(row_factory=dict_row)

    if RESET:
        print("⚠ --reset: xóa toàn bộ dữ liệu...")
        for tbl in [
            "ticket_messages", "tickets",
            "conversation_messages", "conversations",
            "escalations", "alerts", "notifications",
            "settings_security", "settings_roles",
            "analytics_snapshots",
        ]:
            cur.execute(f"TRUNCATE {tbl} RESTART IDENTITY CASCADE")
        conn.commit()

    # ── Conversations + messages ──────────────────────────────────────────
    monitor = load("monitor")
    for c in monitor["conversations"]:
        cur.execute("""
            INSERT INTO conversations
              (id, started_at, duration, customer, phone, channel,
               status, risk, intent, intent_conf, mood, mood_score, mood_pct)
            VALUES (%s, NOW(), %s, %s, %s, 'bot', %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            c["id"], c.get("duration"), c["customer"], c.get("phone"),
            c["status"], c["risk"], c["intent"], c.get("intentConf", 90),
            c.get("mood"), c.get("moodScore"), c.get("moodPct"),
        ))
        for seq, m in enumerate(c.get("transcript", [])):
            cur.execute("""
                INSERT INTO conversation_messages
                  (conversation_id, seq, who, name, sent_at, content, mood, mood_cls)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                c["id"], seq, m["who"], m.get("name"), m.get("time"),
                m.get("text"), m.get("mood"), m.get("moodCls"),
            ))
    print(f"  ✓ conversations: {len(monitor['conversations'])} rows")

    # ── Escalations ───────────────────────────────────────────────────────
    for e in monitor["escalations"]:
        cur.execute("""
            INSERT INTO escalations
              (code, customer, reason, priority, priority_cls, status, status_cls, wait)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            e["code"], e["customer"], e["reason"],
            e["priority"], e["priorityCls"],
            e["status"], e["statusCls"], e["wait"],
        ))
    print(f"  ✓ escalations: {len(monitor['escalations'])} rows")

    # ── Tickets + messages ────────────────────────────────────────────────
    tk_data = load("tickets")
    for t in tk_data["tickets"]:
        sd = t.get("slaDetail", {})
        cur.execute("""
            INSERT INTO tickets
              (id, subject, status, customer, phone, channel,
               priority, priority_cls, sla, sla_note, sla_cls,
               assignee, ai_summary, ai_conf,
               sla_state, sla_total, sla_pct, sla_deadline, actions)
            VALUES (%s,%s,%s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s,%s, %s,%s,%s,%s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (
            t["id"], t["subject"], t["status"], t["customer"],
            t.get("phone"), t.get("channel", "Bot"),
            t["priority"], t["priorityCls"],
            t.get("sla"), t.get("slaNote"), t.get("slaCls", "green"),
            t.get("assignee", "Chưa giao"),
            t.get("aiSummary"), t.get("aiConf"),
            sd.get("state"), sd.get("total"), sd.get("pct", 0), sd.get("deadline"),
            json.dumps(t.get("actions", []), ensure_ascii=False),
        ))
        for seq, m in enumerate(tk_data["ticketThreads"].get(t["id"], [])):
            cur.execute("""
                INSERT INTO ticket_messages
                  (ticket_id, seq, who, name, sent_at, content)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                t["id"], seq, m["who"], m.get("name"), m.get("time"), m.get("text"),
            ))
    print(f"  ✓ tickets: {len(tk_data['tickets'])} rows")

    # ── Alerts ────────────────────────────────────────────────────────────
    overview = load("overview")
    for a in overview.get("alerts", []):
        cur.execute("""
            INSERT INTO alerts
              (occurred_at, level, level_class, type, content, status, status_class)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            a["time"], a["level"], a.get("levelClass", "green"),
            a["type"], a["content"], a["status"], a.get("statusClass", "green"),
        ))
    print(f"  ✓ alerts: {len(overview.get('alerts', []))} rows")

    # ── Notifications ─────────────────────────────────────────────────────
    notif_data = load("notifications")
    for n in notif_data["notifications"]:
        cur.execute("""
            INSERT INTO notifications (icon, title, occurred_at, content)
            VALUES (%s, %s, %s, %s)
        """, (n.get("icon"), n["title"], n.get("time"), n.get("text")))
    print(f"  ✓ notifications: {len(notif_data['notifications'])} rows")

    # ── Settings ──────────────────────────────────────────────────────────
    settings = load("settings")
    for s in settings.get("security", []):
        cur.execute("""
            INSERT INTO settings_security (name, description, enabled)
            VALUES (%s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled
        """, (s["name"], s.get("desc"), s.get("on", True)))
    for r in settings.get("roles", []):
        cur.execute("""
            INSERT INTO settings_roles (name, description, state, cls, enabled)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled
        """, (r["name"], r.get("desc"), r.get("state", "Đang bật"), r.get("cls", "green"), r.get("on", True)))
    print(f"  ✓ settings: {len(settings.get('security',[]))} security, {len(settings.get('roles',[]))} roles")

    # ── Analytics snapshots (lưu nguyên JSON để trả về nhanh) ────────────
    for section in ["overview", "reports", "monitor"]:
        data = load(section)
        cur.execute("""
            INSERT INTO analytics_snapshots (section, data, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (section) DO UPDATE
              SET data = EXCLUDED.data, updated_at = NOW()
        """, (section, json.dumps(data, ensure_ascii=False)))
    for section in ["config"]:
        data = load(section)
        cur.execute("""
            INSERT INTO analytics_snapshots (section, data, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (section) DO UPDATE
              SET data = EXCLUDED.data, updated_at = NOW()
        """, (section, json.dumps(data, ensure_ascii=False)))
    print("  ✓ analytics_snapshots: overview, reports, monitor, config")

    conn.commit()
    print("\n✅ Seed hoàn tất!")


def main() -> None:
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")
    with psycopg.connect(DATABASE_URL) as conn:
        seed(conn)


if __name__ == "__main__":
    main()
