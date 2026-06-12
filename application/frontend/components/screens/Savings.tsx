"use client";
// Tiết kiệm — savings_flow → ui_card{savings}  (Sample 03_50_03_4)
import { useState } from "react";
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { Icon } from "../Icon";
import { savingsOffer, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

export function Savings({ go }: { go: (s: Screen) => void }) {
  const [selectedTerm, setSelectedTerm] = useState(savingsOffer.termMonths);
  const sel = savingsOffer.terms.find((t) => t.months === selectedTerm) ?? savingsOffer.terms[1];

  const estimatedInterest = Math.round(
    savingsOffer.principal * (sel.rate / 100) * (selectedTerm / 12)
  );
  const maturity = savingsOffer.principal + estimatedInterest;

  return (
    <div className="fade">
      <AppBar title="Tiết kiệm" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Gửi tiết kiệm <b>{vnd(savingsOffer.principal)}</b> trong <b>{selectedTerm} tháng</b> với lãi suất <b>{sel.rate}%/năm</b>.
        </AnBlock>

        <div className="card mt12">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div className="muted tiny">Số tiền gửi</div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{vnd(savingsOffer.principal)}</div>
            </div>
            <span className="pill green">Đề xuất</span>
          </div>
          <div className="kv"><span className="kv-k"><Icon.bank size={13} /> Tài khoản nguồn</span><span className="kv-v">{savingsOffer.source}</span></div>
          <div className="kv"><span className="kv-k"><Icon.gauge size={13} /> Lãi suất</span><span className="kv-v" style={{ color: "var(--g600)", fontWeight: 800 }}>{sel.rate}%/năm</span></div>
          <div className="kv"><span className="kv-k"><Icon.trendUp size={13} /> Lãi dự kiến</span><span className="kv-v" style={{ color: "var(--g700)", fontWeight: 700 }}>+{vnd(estimatedInterest)}</span></div>
          <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Nhận về khi đáo hạn</span><span className="kv-v">{vnd(maturity)}</span></div>
        </div>

        <div className="sh">Chọn kỳ hạn</div>
        <div style={{ display: "flex", gap: 10 }}>
          {savingsOffer.terms.map((t) => (
            <button
              key={t.months}
              className={`term-btn${selectedTerm === t.months ? " on" : ""}`}
              onClick={() => setSelectedTerm(t.months)}
            >
              <div className="term-mo">{t.months} tháng</div>
              <div className="term-rate">{t.rate}%</div>
              {"best" in t && t.best && <span className="pill green tiny-pill">Tốt nhất</span>}
            </button>
          ))}
        </div>

        <div className="callout tip mt12">
          <span className="ci"><Icon.info size={15} /></span>
          <span style={{ fontSize: 12 }}>
            Nhận lãi khi đáo hạn · Rút trước hạn áp dụng lãi suất không kỳ hạn 0,1%/năm
          </span>
        </div>

        <button className="btn btn-primary mt16">
          <Icon.checkCircle size={19} /> Xác nhận mở tiết kiệm
        </button>
        <button className="btn btn-ghost mt10">
          <Icon.pencil size={16} /> Điều chỉnh số tiền
        </button>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
