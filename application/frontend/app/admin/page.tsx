"use client";
// Phân hệ Quản trị (/admin) — Phase 6 (§14).
// Shell sidebar + nội dung theo tab. Hiện đã port tab "An tâm Gia đình" sang
// React; các tab còn lại (Tổng quan, Giám sát, Ticket, Báo cáo, Cài đặt) vẫn ở
// legacy-dashboard tĩnh (/dashboard) và sẽ được port dần.
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import "./admin.css";
import FamilyAdmin from "./FamilyAdmin";

type Section = "overview" | "monitor" | "family" | "tickets" | "reports" | "settings";

const NAV: { key: Section; label: string; icon: React.ReactNode; ported?: boolean }[] = [
  { key: "overview", label: "Tổng quan", icon: <IconGrid /> },
  { key: "monitor", label: "Giám sát hội thoại", icon: <IconMonitor /> },
  { key: "family", label: "An tâm Gia đình", icon: <IconHeart />, ported: true },
  { key: "tickets", label: "Ticket hỗ trợ", icon: <IconTicket /> },
  { key: "reports", label: "Báo cáo", icon: <IconChart /> },
  { key: "settings", label: "Cài đặt", icon: <IconGear /> },
];

export default function AdminPage() {
  const [section, setSection] = useState<Section>("family");
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastOn(false), 2200);
  }, []);

  return (
    <div className="admin-console">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">VCB</div>
          <div>
            <div className="brand-title">VCB Admin Console</div>
            <div className="brand-sub">VoiceBank Inclusive</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={n.key === section ? "active" : ""}
              onClick={() => setSection(n.key)}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <Link href="/dashboard" className="control" style={{ justifyContent: "center", fontWeight: 700 }}>
          ↗ Mở console đầy đủ
        </Link>

        <div className="user-card">
          <div className="avatar">A</div>
          <div>
            <div style={{ fontWeight: 850 }}>Admin VCB</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Quản trị viên</div>
          </div>
        </div>
      </aside>

      <main className="main">
        {section === "family" ? (
          <FamilyAdmin toast={toast} />
        ) : (
          <Placeholder label={NAV.find((n) => n.key === section)?.label ?? ""} />
        )}
      </main>

      <div className={`toast ${toastOn ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="placeholder">
      <div className="big">🚧</div>
      <h2 style={{ margin: 0 }}>{label}</h2>
      <p style={{ maxWidth: 420 }}>
        Tab này chưa được port sang Next.js. Hiện có ở console tĩnh{" "}
        <Link href="/dashboard" style={{ color: "var(--g700)", fontWeight: 700 }}>
          /dashboard
        </Link>
        . Sẽ chuyển dần sang React trong Phase 6.
      </p>
    </div>
  );
}

/* ── Icon nav (stroke theo currentColor) ── */
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}
function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M18 19a3 3 0 0 0 3-3v-3h-4v6z" />
      <path d="M6 19a3 3 0 0 1-3-3v-3h4v6z" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 21s-7.5-4.7-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 4c0 5.3-7.5 10-7.5 10Z" />
      <path d="M9 11h6" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 3h6l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3z" />
      <path d="M8 11h8M8 15h6" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 19V5" />
      <path d="M8 17v-7" />
      <path d="M13 17V7" />
      <path d="M18 17v-4" />
      <path d="M4 19h17" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21a2 2 0 0 1-4 0v-.09a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H3a2 2 0 0 1 0-4h.09A1.8 1.8 0 0 0 4.75 8.8a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 9.2 4.6a1.8 1.8 0 0 0 1.1-1.66V3a2 2 0 0 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.66 1.1H21a2 2 0 0 1 0 4h-.09a1.8 1.8 0 0 0-1.51 1.1Z" />
    </svg>
  );
}
