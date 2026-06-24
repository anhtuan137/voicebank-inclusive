"use client";
// Lịch sử giao dịch — spending_insight_flow → ui_card{spending}  (Sample 03_50_03_1)
import { useState } from "react";
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { Icon } from "../Icon";
import { transactions, spendThisMonth, incomeThisMonth, vnd } from "@/lib/mock";
import { useLiveData } from "@/lib/LiveData";
import type { Txn } from "@/lib/types";
import type { BankTxn } from "@/lib/api";
import type { Screen } from "@/lib/types";

const FILTERS = ["Tất cả", "Chi tiêu", "Thu nhập", "Tuần này"] as const;

// Màu theo nhóm chi tiêu để hiển thị icon dòng giao dịch (dữ liệu backend không có màu).
const CAT_COLOR: Record<string, string> = {
  "Chuyển khoản": "#2f80ed",
  "Ăn uống": "#e11d48",
  "Di chuyển": "#0f9d58",
  "Thu nhập": "#16955a",
  "Hoá đơn": "#f59e0b",
  "Hóa đơn": "#f59e0b",
  "Mua sắm": "#f97316",
};

/** Map giao dịch backend → kiểu hiển thị của UI (Txn). */
function toDisplay(t: BankTxn): Txn {
  const [y, m, d] = t.date.split("-");
  return {
    id: t.id,
    merchant: t.desc,
    category: t.category || "Khác",
    date: d && m && y ? `${d}/${m}/${y}` : t.date,
    amount: t.amount,
    icon: (t.desc?.trim()?.[0] ?? "₫").toUpperCase(),
    color: CAT_COLOR[t.category] ?? "#64748b",
  };
}

export function History({ go }: { go: (s: Screen) => void }) {
  const [active, setActive] = useState<typeof FILTERS[number]>("Tất cả");

  // Nối Mock Bank Core: nếu lấy được giao dịch thật thì hiển thị chúng + tính tổng
  // chi/thu từ đó; offline → dùng mock.
  const { transactions: live } = useLiveData();
  const rows: Txn[] = live ? live.map(toDisplay) : transactions;
  const chi = live ? live.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0) : spendThisMonth;
  const thu = live ? live.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) : incomeThisMonth;

  const list = rows.filter((t) =>
    active === "Chi tiêu" ? t.amount < 0
    : active === "Thu nhập" ? t.amount > 0
    : true
  );

  return (
    <div className="fade">
      <AppBar title="Lịch sử giao dịch" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Anh Tuấn ơi, đây là các giao dịch gần đây của bạn.
        </AnBlock>

        {/* summary */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
            <Icon.calendar size={15} style={{ color: "var(--g600)" }} />
            7 ngày qua &nbsp;·&nbsp; 19/05 – 25/05/2025
          </div>
          <div className="stat-2">
            <div className="stat">
              <div className="lbl"><Icon.trendDown size={13} /> Chi tiêu</div>
              <div className="val amt-out">{vnd(chi)}</div>
            </div>
            <div className="stat">
              <div className="lbl"><Icon.trendUp size={13} /> Thu vào</div>
              <div className="val amt-in">+{vnd(thu)}</div>
            </div>
          </div>
        </div>

        {/* filter chips */}
        <div className="chip-row mt8">
          {FILTERS.map((f) => (
            <button key={f} className={`chip${active === f ? " on" : ""}`} onClick={() => setActive(f)}>
              {f}
            </button>
          ))}
        </div>

        {/* transaction list */}
        <div className="card mt8">
          {list.map((t) => (
            <div key={t.id} className="lrow">
              <span className="lrow-ico" style={{ background: t.color }}>
                {t.icon}
              </span>
              <div className="lrow-main">
                <div className="lrow-title">{t.merchant}</div>
                <div className="lrow-sub">{t.category} · {t.date}</div>
              </div>
              <div>
                <div className={`lrow-amt ${t.amount < 0 ? "amt-out" : "amt-in"}`}>
                  {t.amount > 0 ? "+" : ""}{vnd(t.amount)}
                </div>
                <Icon.chevron size={14} style={{ color: "var(--faint)", marginTop: 2, display: "block", marginLeft: "auto" }} />
              </div>
            </div>
          ))}
        </div>

        {/* insight nudge */}
        <button className="insight-bar mt12" style={{ width: "100%", textAlign: "left" }} onClick={() => go("forecast")}>
          <Icon.sparkle size={18} style={{ color: "var(--g600)", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>
            Bạn chi nhiều nhất cho <b>Ăn uống</b> tuần này
          </span>
          <Icon.chevron size={15} style={{ color: "var(--muted)" }} />
        </button>

        {/* actions */}
        <div className="btn-row mt12">
          <button className="btn btn-ghost" style={{ fontSize: 13 }}>
            <Icon.doc size={15} /> Xuất sao kê
          </button>
          <button className="btn btn-soft" style={{ fontSize: 13 }}>
            <Icon.filter size={15} /> Lọc nâng cao
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
