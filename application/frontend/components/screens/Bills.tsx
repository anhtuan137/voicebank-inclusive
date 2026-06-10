"use client";
// Nhắc hóa đơn — generate_nudges (§12)  (Sample 03_50_03_2)
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { Icon } from "../Icon";
import { bills, billsTotal, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const STATUS_PILL = {
  today:    { cls: "red",    label: "Hôm nay"      },
  soon:     { cls: "orange", label: "Sắp đến hạn"  },
  upcoming: { cls: "green",  label: "Còn hạn"       },
} as const;

export function Bills({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="fade">
      <AppBar title="Nhắc hóa đơn" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>Hôm nay bạn có <b>3 hóa đơn</b> cần chú ý.</AnBlock>

        <div className="card">
          {bills.map((b) => {
            const I = Icon[b.icon];
            const p = STATUS_PILL[b.status];
            return (
              <div key={b.id} className="lrow">
                <span className="lrow-ico" style={{ background: b.color }}>
                  <I size={22} />
                </span>
                <div className="lrow-main">
                  <div className="lrow-title">{b.name}</div>
                  <div className="lrow-sub">{b.provider}</div>
                  <span className={`pill ${p.cls}`} style={{ marginTop: 4, display: "inline-flex" }}>
                    {p.label}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="lrow-amt">{vnd(b.amount)}</div>
                  <Icon.chevron size={14} style={{ color: "var(--faint)", marginTop: 4, display: "block", marginLeft: "auto" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* total */}
        <div className="card mt12">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="muted tiny">Tổng thanh toán hôm nay</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginTop: 3 }}>{vnd(billsTotal)}</div>
            </div>
            <Icon.wallet size={32} style={{ color: "var(--g200)" }} />
          </div>
          {/* mini bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 14, height: 40 }}>
            {["T2","T3","T4","T5","T6","T7","CN"].map((d, i) => (
              <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", borderRadius: 4, background: i === 3 ? "var(--g500)" : "var(--g100)", height: [20, 28, 16, 40, 24, 18, 12][i] }} />
                <span style={{ fontSize: 9, color: "var(--faint)", fontWeight: 600 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="callout tip mt12">
          <span className="ci"><Icon.sparkle size={16} /></span>
          <span>
            <b>Đề xuất từ An:</b> Thanh toán ngay hôm nay để tránh quên và giữ điểm tín dụng tốt.
          </span>
        </div>

        <button className="btn btn-primary mt16">
          <Icon.checkCircle size={19} /> Thanh toán tất cả
        </button>

        <div className="btn-row mt12">
          <button className="btn btn-ghost" style={{ fontSize: 12.5 }}>
            <Icon.phone size={14} /> Nạp lại lần sau
          </button>
          <button className="btn btn-soft" style={{ fontSize: 12.5 }}>
            <Icon.bolt size={14} /> Tự động thanh toán
          </button>
        </div>
      </div>
      <ActionChips onSettings={go} />
      <div style={{ height: 16 }} />
    </div>
  );
}
