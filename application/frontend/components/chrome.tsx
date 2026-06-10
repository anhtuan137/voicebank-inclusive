"use client";
import { Icon } from "./Icon";
import type { Screen } from "@/lib/types";

/* ── iOS status bar ── */
export function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className={`statusbar${light ? " light" : ""}`} aria-hidden>
      {/* Time — SF-style bold */}
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>14:20</span>

      <div className="sb-r">
        {/* Signal bars — 4 bars, iPhone proportions */}
        <svg width="18" height="13" viewBox="0 0 18 13" fill="currentColor">
          <rect x="0"    y="9"   width="3.2" height="4"  rx="1"/>
          <rect x="4.8"  y="6"   width="3.2" height="7"  rx="1"/>
          <rect x="9.6"  y="3"   width="3.2" height="10" rx="1"/>
          <rect x="14.4" y="0"   width="3.2" height="13" rx="1" opacity="0.28"/>
        </svg>

        {/* WiFi — nested arcs + dot */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none"
          stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0.8 4.4a10.2 10.2 0 0 1 14.4 0"  strokeWidth="1.7"/>
          <path d="M3.2 6.9a6.6 6.6 0 0 1 9.6 0"     strokeWidth="1.7"/>
          <path d="M5.7 9.3a3 3 0 0 1 4.6 0"         strokeWidth="1.7"/>
          <circle cx="8" cy="11.4" r="1.15" fill="currentColor" stroke="none"/>
        </svg>

        {/* Battery — iPhone-style outline + fill + nub + % text */}
        <svg width="28" height="14" viewBox="0 0 28 14">
          {/* body outline */}
          <rect x="0.7" y="0.7" width="22.6" height="12.6" rx="3.6"
            stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.38"/>
          {/* nub */}
          <rect x="24" y="4.2" width="2.8" height="5.6" rx="1.4"
            fill="currentColor" opacity="0.4"/>
          {/* fill ~82% of inner width (22.6 - 2*1.8 = 19px) → 15.6px */}
          <rect x="2.3" y="2.3" width="15.6" height="9.4" rx="2.2"
            fill="currentColor" opacity="0.9"/>
          {/* percentage */}
          <text x="11" y="10.4" textAnchor="middle"
            fontSize="7.5" fontWeight="800" fontFamily="Arial,sans-serif"
            fill="white">82</text>
        </svg>
      </div>
    </div>
  );
}

/* ── Feature screen app bar ── */
export function AppBar({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <header className="appbar">
      {onBack && (
        <button className="iconbtn" aria-label="Quay lại" onClick={onBack}>
          <Icon.back size={20} />
        </button>
      )}
      <div className="appbar-title" style={{ flex: 1 }}>
        <h1>{title}</h1>
        <div className="appbar-brand">
          <span className="dot">
            <Icon.sparkle size={9} style={{ color: "#fff" }} />
          </span>
          VoiceBank Inclusive
        </div>
      </div>
      <div className="appbar-right">
        <button className="iconbtn" aria-label="Thông báo">
          <Icon.bell size={19} />
        </button>
        {onClose ? (
          <button className="iconbtn" aria-label="Đóng" onClick={onClose}>
            <Icon.close size={19} />
          </button>
        ) : (
          <button className="iconbtn" aria-label="Khóa">
            <Icon.power size={19} />
          </button>
        )}
      </div>
    </header>
  );
}

/* ── Bottom navigation (VCB style) ── */
export function BottomNav({
  active,
  onNav,
}: {
  active: Screen;
  onNav: (s: Screen) => void;
}) {
  return (
    <nav className="bottomnav">
      {/* Sản phẩm */}
      <button
        className={`nav-item${active === "home" ? " active" : ""}`}
        onClick={() => onNav("home")}
      >
        <Icon.home size={22} />
        Sản phẩm
      </button>

      {/* QR (center) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button className="nav-qr" aria-label="QR" onClick={() => onNav("home")}>
          <Icon.qr size={26} />
        </button>
      </div>

      {/* Cài đặt */}
      <button
        className={`nav-item${active === "accessibility" ? " active" : ""}`}
        onClick={() => onNav("accessibility")}
      >
        <Icon.settings size={22} />
        Cài đặt
      </button>

      {/* Assistant avatar */}
      <button
        className="nav-item"
        aria-label="Trợ lý VoiceBank"
        onClick={() => onNav("assistant")}
      >
        <span
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#e4f9ef,#c8edd8)",
            display: "grid", placeItems: "center",
            border: "2px solid var(--g200)",
          }}
        >
          <Icon.chat size={18} style={{ color: "var(--g700)" }} />
        </span>
      </button>

      {/* tagline */}
      <div className="nav-tagline">Quản lý tài chính cá nhân</div>
    </nav>
  );
}
