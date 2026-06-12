"use client";
// Hỗ trợ tổng đài — escalation_flow (§14)  (Sample 03_50_03_6)
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { Icon } from "../Icon";
import { supportTicket } from "@/lib/mock";
import type { Screen } from "@/lib/types";

export function Support({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="fade">
      <AppBar title="Hỗ trợ tổng đài" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Tôi đã tóm tắt yêu cầu và chuyển cho nhân viên hỗ trợ. Họ sẽ gọi lại cho bạn sớm.
        </AnBlock>

        <div className="card mt12">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="muted tiny">Mã yêu cầu</div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>{supportTicket.code}</div>
            </div>
            <span className="pill orange">{supportTicket.status}</span>
          </div>
          <div style={{ marginTop: 12, borderTop: "1px solid var(--g050)", paddingTop: 12 }}>
            <div className="kv"><span className="kv-k"><Icon.doc size={13} /> Vấn đề</span><span className="kv-v">{supportTicket.issue}</span></div>
            <div className="kv"><span className="kv-k"><Icon.gauge size={13} /> Mức độ</span><span className="kv-v">{supportTicket.amount}</span></div>
            <div className="kv"><span className="kv-k"><Icon.clock size={13} /> Thời gian chờ</span><span className="kv-v">~{supportTicket.wait}</span></div>
          </div>
        </div>

        <div className="sh">Tóm tắt cuộc trò chuyện</div>
        <div className="tl">
          {[...supportTicket.summary].reverse().map((item, i) => (
            <div key={i} className="tl-item">
              <div className="tl-dot" style={{ background: item.who === "An" ? "var(--g500)" : "var(--g200)" }} />
              <div className="tl-body">
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                  {item.time} · {item.who}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{item.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="callout tip mt12">
          <span className="ci"><Icon.headset size={16} /></span>
          <span>
            Hàng đợi hiện có <b>3 người</b>. Dự kiến chờ <b>~{supportTicket.wait}</b>.
          </span>
        </div>

        <div className="mt16" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary">
            <Icon.phone size={17} /> Gọi ngay cho tổng đài
          </button>
          <button className="btn btn-ghost">
            <Icon.chat size={16} /> Tiếp tục chat với An
          </button>
          <button className="btn btn-soft">
            <Icon.copy size={15} /> Sao chép mã yêu cầu
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
