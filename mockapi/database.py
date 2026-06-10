"""Database connection helper cho VoiceBank mockapi.

Hỗ trợ hai chế độ qua biến môi trường DB_SOURCE:
  - json     : đọc file JSON tĩnh (mặc định, không cần Postgres)
  - postgres : kết nối PostgreSQL qua DATABASE_URL
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

import psycopg
from psycopg.rows import dict_row

DB_SOURCE = os.getenv("DB_SOURCE", "json").lower()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://voicebank:voicebank@localhost:5432/voicebank",
)

# Thư mục chứa file JSON fallback
_DATA_DIR = Path(__file__).parent.parent / "application/frontend/public/dashboard/data"


# ── JSON fallback ────────────────────────────────────────────────────────────

def load_json(name: str) -> Any:
    """Đọc một file JSON từ thư mục data/."""
    path = _DATA_DIR / f"{name}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


# ── PostgreSQL connection ─────────────────────────────────────────────────────

@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    """Context manager trả về một psycopg connection.

    Usage:
        with get_conn() as conn:
            rows = conn.execute("SELECT ...").fetchall()
    """
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def is_postgres() -> bool:
    return DB_SOURCE == "postgres"
