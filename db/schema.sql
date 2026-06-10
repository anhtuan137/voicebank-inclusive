-- =============================================================================
-- VoiceBank Inclusive — PostgreSQL Schema
-- Run once: psql -U voicebank -d voicebank -f db/schema.sql
-- =============================================================================

-- ── Conversations (phiên hội thoại bot đang diễn ra) ──────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT        PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration      TEXT,
  customer      TEXT        NOT NULL,
  phone         TEXT,
  channel       TEXT        NOT NULL DEFAULT 'bot',
  status        TEXT        NOT NULL DEFAULT 'bot',   -- bot|verify|escalated|takenover
  risk          TEXT        NOT NULL DEFAULT 'low',   -- low|medium|high
  intent        TEXT,
  intent_conf   INT,
  mood          TEXT,
  mood_score    TEXT,
  mood_pct      INT
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id              SERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  seq             INT  NOT NULL DEFAULT 0,
  who             TEXT NOT NULL,   -- kh | an
  name            TEXT,
  sent_at         TEXT,
  content         TEXT,
  mood            TEXT,
  mood_cls        TEXT
);

-- ── Tickets (phiếu hỗ trợ) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id              TEXT        PRIMARY KEY,
  subject         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'new',   -- new|processing|waiting|closed
  customer        TEXT        NOT NULL,
  phone           TEXT,
  channel         TEXT        NOT NULL DEFAULT 'Bot',
  priority        TEXT        NOT NULL DEFAULT 'Thấp',
  priority_cls    TEXT        NOT NULL DEFAULT 'green', -- green|orange|red
  sla             TEXT,
  sla_note        TEXT,
  sla_cls         TEXT        DEFAULT 'green',
  assignee        TEXT        DEFAULT 'Chưa giao',
  ai_summary      TEXT,
  ai_conf         INT,
  sla_state       TEXT,
  sla_total       TEXT,
  sla_pct         INT         DEFAULT 0,
  sla_deadline    TEXT,
  actions         JSONB       DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_conv_id  TEXT        REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id        SERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  seq       INT  NOT NULL DEFAULT 0,
  who       TEXT NOT NULL,   -- kh | nv
  name      TEXT,
  sent_at   TEXT,
  content   TEXT
);

-- ── Escalations (hàng đợi chờ nhân viên) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL,
  customer     TEXT,
  reason       TEXT,
  priority     TEXT,
  priority_cls TEXT DEFAULT 'green',
  status       TEXT,
  status_cls   TEXT DEFAULT 'green',
  wait         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alerts (cảnh báo hệ thống) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           SERIAL      PRIMARY KEY,
  occurred_at  TEXT,
  level        TEXT        NOT NULL,
  level_class  TEXT        DEFAULT 'green',
  type         TEXT,
  content      TEXT,
  status       TEXT,
  status_class TEXT        DEFAULT 'green',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications (thông báo nhân viên) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL      PRIMARY KEY,
  icon        TEXT        DEFAULT '🔴',
  title       TEXT        NOT NULL,
  occurred_at TEXT,
  content     TEXT,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Settings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings_security (
  id          SERIAL  PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  enabled     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS settings_roles (
  id          SERIAL  PRIMARY KEY,
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  state       TEXT    DEFAULT 'Đang bật',
  cls         TEXT    DEFAULT 'green',
  enabled     BOOLEAN DEFAULT TRUE
);

-- ── Analytics snapshots (dữ liệu chart/heatmap — cập nhật định kỳ) ───────
-- Lưu nguyên JSON structure để API trả về, không cần tính lại mỗi lần
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id         SERIAL      PRIMARY KEY,
  section    TEXT        NOT NULL UNIQUE,  -- overview|reports|monitor_kpis
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_status   ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_risk     ON conversations(risk);
CREATE INDEX IF NOT EXISTS idx_conversations_started  ON conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status         ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_cls   ON tickets(priority_cls);
CREATE INDEX IF NOT EXISTS idx_tickets_created        ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created         ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_snapshots_section      ON analytics_snapshots(section);
