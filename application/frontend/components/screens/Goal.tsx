"use client";
// Mục tiêu tài chính — savings_goal_flow → ui_card{goal}  (Sample 03_50_03_5)
import { AppBar } from "../chrome";
import { AnBlock, Ring } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { Icon } from "../Icon";
import { goal, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const BADGES = [
  { icon: "flame",  label: "Streak 5 ngày",   unlocked: true  },
  { icon: "target", label: "Đúng hạn",         unlocked: true  },
  { icon: "trophy", label: "Chuyên cần",        unlocked: false },
  { icon: "globe",  label: "Mục tiêu lớn",      unlocked: false },
] as const;

export function Goal({ go }: { go: (s: Screen) => void }) {
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

        <button className="btn btn-primary mt16">
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
      <ActionChips onSettings={go} />
      <div style={{ height: 16 }} />
    </div>
  );
}
