"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Robot } from "../primitives";
import { Icon } from "../Icon";
import { user, favorites, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const QUICK: { label: string; to: Screen; icon: keyof typeof Icon }[] = [
  { label: "An tâm Gia đình",   to: "family",    icon: "users"     },
  { label: "Chuyển tiền",       to: "transfer",  icon: "transfer"  },
  { label: "Dự báo cháy túi",   to: "forecast",  icon: "trendDown" },
  { label: "Mở tiết kiệm",      to: "savings",   icon: "piggy"     },
];

export function Home({ go }: { go: (s: Screen) => void }) {
  const [open, setOpen]               = useState(false);
  const [atTop, setAtTop]             = useState(true);
  const [balanceVisible, setBalance]  = useState(false);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const el = document.querySelector(".screen") as HTMLElement | null;
    if (!el) return;
    const handler = () => setAtTop(el.scrollTop < 70);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const copyAccount = () => {
    navigator.clipboard.writeText(user.account).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="fade" style={{ position: "relative", minHeight: "100%" }}>

      {/* ── STICKY TOPBAR ── */}
      <div className={`home-topbar${atTop ? "" : " scrolled"}`}>
        <Image src="/vcb-digibank-logo.png" alt="VCB Digibank"
          width={317} height={60} priority
          style={{ height: 30, width: "auto", display: "block" }} />
        <div className="home-topbar-right">
          <button className="iconbtn light" aria-label="Thông báo"><Icon.bell size={20} /></button>
          <button className="iconbtn light" aria-label="Khóa màn hình"><Icon.power size={20} /></button>
        </div>
      </div>

      {/* ── HERO IMAGE — natural 941×400 ratio ── */}
      <section className="home-hero">
        <div className="home-city" aria-hidden>
          <Image src="/vcb-header-bg.png" alt="" width={941} height={400} priority
            style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "center 40%" }} />
        </div>
        <div className="home-robot-wrap" onClick={() => setOpen(true)} role="button" aria-label="Mở VoiceBank Inclusive">
          <div className="home-robot-float">
            <div className="home-robot-bubble">
              Hôm nay, mình có thể<br />giúp gì cho bạn?
            </div>
            <Robot size="lg" />
          </div>
        </div>
      </section>

      {/* ── GRADIENT BRIDGE wraps card + content so sides show gradient not black ── */}
      <div className="home-bridge">
      <div className="acct-card">

        {/* VCB logo watermark — top-right, partially clipped by overflow:hidden */}
        <div className="acct-wm" aria-hidden>
          <Image
            src="/vcb-logo.png"
            alt=""
            width={140}
            height={135}
            style={{ display: "block" }}
          />
        </div>

        {/* Row 1 — avatar + name/tier + QR */}
        <div className="acct-row1">
          <span className="acct-avatar"><Icon.user size={22} /></span>
          <div className="acct-info">
            <div className="acct-name">{user.nameUpper}</div>
            <div className="acct-tier">
              <Icon.shield size={12} />
              {user.tier}
              <Icon.chevron size={12} />
            </div>
          </div>
          <button className="acct-qr-btn">
            <Icon.qr size={16} /> QR
          </button>
        </div>

        {/* Row 2 — account number */}
        <div className="acct-field">
          <span className="acct-lbl">Số tài khoản</span>
          <span className="acct-val">{user.account}</span>
          <button
            className={`acct-icn${copied ? " ok" : ""}`}
            onClick={copyAccount}
            aria-label="Sao chép số tài khoản"
          >
            {copied ? <Icon.checkCircle size={15} /> : <Icon.copy size={15} />}
          </button>
          {copied && <span className="acct-toast">Đã sao chép!</span>}
        </div>

        {/* Row 3 — balance */}
        <div className="acct-field">
          <span className="acct-lbl">Số dư</span>
          <span className={`acct-val${balanceVisible ? "" : " acct-bal-hidden"}`}>
            {balanceVisible ? vnd(user.balance) : "*********"}
          </span>
          <button
            className="acct-icn"
            onClick={() => setBalance((v) => !v)}
            aria-label={balanceVisible ? "Ẩn số dư" : "Hiện số dư"}
          >
            {balanceVisible ? <Icon.eye size={18} /> : <Icon.eyeAcc size={18} />}
          </button>
        </div>

        {/* Row 4 — actions */}
        <div className="acct-actions">
          <button className="acct-action-btn" onClick={() => go("history")}>
            <Icon.history size={15} /> Lịch sử giao dịch
          </button>
          <span className="acct-divider" />
          <button className="acct-action-btn">
            <Icon.card size={15} /> Tài khoản &amp; Thẻ
          </button>
        </div>
      </div>{/* end acct-card */}

      <div className="home-content">

        <div className="home-section">
          <div className="section-head">
            <div className="section-head-left">
              <Icon.grid size={15} style={{ color: "var(--g600)" }} />
              Chức năng ưa thích
              <Icon.sparkle size={13} style={{ color: "var(--muted)" }} />
            </div>
            <div className="section-head-right">
              <span style={{ width: 15, height: 15, borderRadius: "50%", border: "1.5px solid var(--muted)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", border: "1.5px solid var(--muted)" }} />
              </span>
              Tìm kiếm
            </div>
          </div>

          <div className="fav-grid">
            {favorites.map((f) => {
              const I = Icon[f.icon as keyof typeof Icon];
              return (
                <button key={f.label} className="fav-item"
                  onClick={() => {
                    if (f.label === "Mở tiết kiệm") go("savings");
                    else if (f.label.includes("Chuyển")) go("transfer");
                    else if (f.label.includes("Gia đình")) go("family");
                    else if (f.label.includes("xem phim") || f.label.includes("điện thoại")) go("billpay");
                  }}
                >
                  <span className="fav-ico"><I size={26} /></span>
                  <span className="fav-label">{f.label}</span>
                </button>
              );
            })}
          </div>

          <button className="see-all">
            Xem tất cả <Icon.chevron size={13} style={{ color: "var(--g700)" }} />
          </button>
        </div>

        {/* Promo strip */}
        <div className="promo-row">
          <div className="promo-card">
            <span className="promo-ico" style={{ background: "linear-gradient(135deg,#ffb84d,#ff7a20)" }}>
              <Icon.trophy size={24} />
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>VCB Loyalty</div>
              <div className="muted tiny" style={{ marginTop: 3 }}>Tích điểm mọi giao dịch</div>
            </div>
          </div>
          <div className="promo-card">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                Miễn lãi 45 ngày, hoàn tiền chi tiêu lên đến 12%
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                {["VISA", "MC", "JCB"].map((b) => (
                  <span key={b} style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                    background: b === "VISA" ? "#1a1f6c" : b === "MC" ? "#eb001b" : "#003087", color: "#fff" }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>{/* end home-content */}
      </div>{/* end home-bridge */}

      {/* ── VOICEBANK WIDGET ── */}
      {open && (
        <div className="widget-overlay">
          <div className="widget-header">
            <span className="wh-icon"><Robot size="sm" /></span>
            <span className="wh-title">VoiceBank Inclusive</span>
            <Icon.info size={16} style={{ color: "var(--g600)", flexShrink: 0 }} />
            <button style={{ color: "var(--muted)", marginLeft: 6 }} onClick={() => setOpen(false)}>
              <Icon.close size={18} />
            </button>
          </div>
          <div className="widget-body">
            <div className="an-block" style={{ marginBottom: 0, boxShadow: "none", padding: 0, background: "none" }}>
              <Robot />
              <div className="an-inner">
                <div className="an-label">
                  <span className="an-label-dot">
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--g500)", display: "inline-block" }} />
                    An
                  </span>
                </div>
                <div className="an-bubble">
                  Xin chào {user.shortName ?? user.name.split(" ").pop()}, tôi có thể giúp gì cho bạn hôm nay?
                </div>
              </div>
            </div>
            <div className="widget-quick">
              {QUICK.map((q) => {
                const I = Icon[q.icon];
                return (
                  <button key={q.label} className="widget-chip" onClick={() => go(q.to)}>
                    <I size={14} /> {q.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="widget-cta" onClick={() => go("assistant")}>
            <Icon.mic size={18} /> Nói chuyện với An
          </button>
        </div>
      )}
    </div>
  );
}
