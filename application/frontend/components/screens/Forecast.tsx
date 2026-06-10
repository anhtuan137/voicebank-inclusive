"use client";
// Dự báo dòng tiền — cashflow_forecast_flow → ui_card{forecast}  (Sample 03_50_03_8)
import { AppBar } from "../chrome";
import { AnBlock, Sparkline, Donut } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { Icon } from "../Icon";
import { forecast, spendCategories, spendTotal, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

export function Forecast({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="fade">
      <AppBar title="Dự báo dòng tiền" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Cuối tháng tài khoản bạn dự kiến còn <b>{vnd(forecast.endBalance)}</b>. Cần điều chỉnh chi tiêu.
        </AnBlock>

        <div className="card mt12">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
            <div>
              <div className="muted tiny">Số dư hiện tại</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{vnd(forecast.current)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="muted tiny">Cuối tháng</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--red)" }}>{vnd(forecast.endBalance)}</div>
            </div>
          </div>
          <Sparkline points={forecast.curve} height={88} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 11, color: "var(--faint)", fontWeight: 600 }}>
            <span>Hôm nay</span>
            <span>15/06</span>
            <span>30/06</span>
          </div>
        </div>

        <div className="sh">Chi tiêu theo danh mục</div>
        <div className="card">
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Donut
              segments={spendCategories.map((c) => ({ pct: c.pct, color: c.color }))}
              cLabel="Tháng 5"
              cValue={`${(spendTotal / 1_000_000).toFixed(1)}tr`}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              {spendCategories.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`callout${forecast.alertLevel === "warn" ? " warn" : " tip"} mt12`}>
          <span className="ci"><Icon.alert size={16} /></span>
          <span>
            <b>Cảnh báo:</b> Dòng tiền dự báo âm nếu chi tiêu giữ nguyên xu hướng hiện tại.
          </span>
        </div>

        <div className="sh">Gợi ý tối ưu</div>
        <div className="card">
          {[
            { icon: "trendDown", text: "Giảm chi ăn uống ~500.000đ/tuần", pct: "-7%" },
            { icon: "transfer",  text: "Tối ưu hóa tự động nạp tiết kiệm",  pct: "+3%" },
            { icon: "calendar",  text: "Dời lịch thanh toán EVN sang ngày 5", pct: "±0%" },
          ].map((r, i) => {
            const I = Icon[r.icon as keyof typeof Icon];
            return (
              <div key={i} className="lrow" style={{ padding: "10px 2px" }}>
                <I size={18} style={{ color: "var(--g600)", flexShrink: 0 }} />
                <div className="lrow-main">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.text}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", background: "var(--g050)", borderRadius: 8, padding: "2px 8px" }}>
                  {r.pct}
                </span>
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary mt16" onClick={() => go("savings")}>
          <Icon.piggy size={17} /> Gửi tiết kiệm để tối ưu
        </button>
      </div>
      <ActionChips onSettings={go} />
      <div style={{ height: 16 }} />
    </div>
  );
}
