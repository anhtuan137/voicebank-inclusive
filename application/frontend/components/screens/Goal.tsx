"use client";
// Mục tiêu tài chính — savings_goal_flow → ui_card{goal}  (Sample 03_50_03_5)
import { useState } from "react";
import { AppBar } from "../chrome";
import { AnBlock, Ring } from "../primitives";
import { Icon } from "../Icon";
import { goal, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const BADGES = [
  { icon: "flame",  label: "Streak 5 ngày",   unlocked: true  },
  { icon: "target", label: "Đúng hạn",         unlocked: true  },
  { icon: "trophy", label: "Chuyên cần",        unlocked: false },
  { icon: "globe",  label: "Mục tiêu lớn",      unlocked: false },
] as const;

export function Goal({ go, rate }: { go: (s: Screen) => void; rate?: (ctx: string) => void }) {
  const [done, setDone] = useState(false);

  const confirm = () => setDone(true); // nạp xong → màn "Nạp thành công"
  // Chỉ khi đóng màn thành công mới mời đánh giá phiên (CSAT, §14).
  const finish = () => (rate ? rate("Nạp mục tiêu tiết kiệm") : go("home"));

  if (done) {
    return (
      <div className="fade">
        <AppBar title="Nạp mục tiêu thành công" onClose={finish} />
        <div className="pad">
          <div style={{ textAlign: "center", paddingTop: 12 }}>
            <span style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon.checkCircle size={42} />
            </span>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Đã nạp vào mục tiêu</div>
            <div style={{ fontWeight: 900, fontSize: 28, color: "var(--g700)", marginTop: 6 }}>+{vnd(goal.autoDeposit)}</div>
            <div className="muted tiny" style={{ marginTop: 2 }}>{goal.name}</div>

            <div className="card mt16" style={{ textAlign: "left" }}>
              <div className="kv"><span className="kv-k"><Icon.target size={13} /> Mục tiêu</span><span className="kv-v">{vnd(goal.target)}</span></div>
              <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Đã tích lũy</span><span className="kv-v" style={{ color: "var(--g700)", fontWeight: 700 }}>{vnd(goal.current + goal.autoDeposit)}</span></div>
              <div className="kv"><span className="kv-k"><Icon.clock size={13} /> Deadline</span><span className="kv-v">{goal.deadline}</span></div>
            </div>

            <button className="btn btn-primary mt16" style={{ width: "100%" }} onClick={finish}>
              <Icon.home size={18} /> Về trang chủ
            </button>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    );
  }

  return (
    <div className="fade">
      <AppBar title="Mục tiêu tài chính" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Bạn đang rất kỷ luật! Còn <b>{vnd(goal.target - goal.current)}</b> là đạt mục tiêu.
        </AnBlock>

        <div className="card goal-hero mt12">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Ring pct={goal.pct} sub="đã đạt" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{goal.name}</div>
              <div className="muted tiny" style={{ marginTop: 4 }}>Deadline: {goal.deadline}</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>
                  <span>{vnd(goal.current)}</span>
                  <span>{vnd(goal.target)}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${goal.pct}%` }} />
                </div>
              </div>
              <span className="pill green" style={{ marginTop: 8, display: "inline-flex" }}>
                <Icon.flame size={12} /> {goal.badge}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-2 mt12">
          <div className="card stat">
            <div className="lbl"><Icon.flame size={14} style={{ color: "#f97316" }} /> Streak</div>
            <div className="val">{goal.streak} ngày</div>
          </div>
          <div className="card stat">
            <div className="lbl"><Icon.transfer size={14} style={{ color: "var(--g600)" }} /> Tự động</div>
            <div className="val">{vnd(goal.autoDeposit)}/tháng</div>
          </div>
        </div>

        <div className="sh">Huy hiệu</div>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const I = Icon[b.icon];
            return (
              <div key={b.label} className={`badge-item${b.unlocked ? " on" : ""}`}>
                <span className="badge-ico"><I size={22} /></span>
                <span className="badge-lbl">{b.label}</span>
                {!b.unlocked && <span style={{ fontSize: 10, color: "var(--faint)" }}>Chưa đạt</span>}
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary mt16" onClick={confirm}>
          <Icon.plus size={17} /> Nạp thêm vào mục tiêu
        </button>
        <div className="btn-row mt10">
          <button className="btn btn-ghost" style={{ fontSize: 12.5 }}>
            <Icon.pencil size={14} /> Chỉnh sửa mục tiêu
          </button>
          <button className="btn btn-soft" style={{ fontSize: 12.5 }} onClick={() => go("savings")}>
            <Icon.piggy size={14} /> Mở tiết kiệm
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
