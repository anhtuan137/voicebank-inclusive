"use client";
// Chuyển tiền — money_transfer_flow → action_required PIN/OTP/face  (Sample 03_50_03_7)
import { useState } from "react";
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { Icon } from "../Icon";
import { transferDraft, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const TABS = ["Biometric", "OTP", "PIN"] as const;

export function Transfer({ go }: { go: (s: Screen) => void }) {
  const [tab, setTab] = useState<typeof TABS[number]>("Biometric");
  const [pin, setPin] = useState("");

  const handleKey = (k: string) => {
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (pin.length < 6) setPin((p) => p + k);
  };

  return (
    <div className="fade">
      <AppBar title="Xác nhận chuyển tiền" onClose={() => go("home")} />
      <div className="pad">
        {transferDraft.fraudFlag && (
          <div className="callout warn">
            <span className="ci"><Icon.alert size={17} /></span>
            <span><b>Cảnh báo:</b> Số tài khoản này chưa từng được chuyển tiền. Kiểm tra kỹ trước khi xác nhận.</span>
          </div>
        )}

        <div className="mt12">
          <AnBlock>
            Xác nhận chuyển <b>{vnd(transferDraft.amount)}</b> đến <b>{transferDraft.beneficiary}</b>.
          </AnBlock>
        </div>

        <div className="card mt12">
          <div className="kv"><span className="kv-k"><Icon.user size={13} /> Người nhận</span><span className="kv-v" style={{ fontWeight: 700 }}>{transferDraft.beneficiary}</span></div>
          <div className="kv"><span className="kv-k"><Icon.bank size={13} /> Ngân hàng</span><span className="kv-v">{transferDraft.bank}</span></div>
          <div className="kv"><span className="kv-k"><Icon.card size={13} /> Số tài khoản</span><span className="kv-v">{transferDraft.account}</span></div>
          <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Số tiền</span><span className="kv-v" style={{ fontWeight: 800, fontSize: 16 }}>{vnd(transferDraft.amount)}</span></div>
          <div className="kv"><span className="kv-k"><Icon.note size={13} /> Nội dung</span><span className="kv-v">{transferDraft.note}</span></div>
        </div>

        <div className="auth-tabs mt16">
          {TABS.map((t) => (
            <button key={t} className={`auth-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Biometric" && (
          <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
            <div style={{ background: "var(--g050)", borderRadius: 24, display: "inline-flex", padding: 22, marginBottom: 12 }}>
              <Icon.face size={52} style={{ color: "var(--g600)" }} />
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Xác thực khuôn mặt để xác nhận</div>
            <button className="btn btn-primary mt16" style={{ width: "100%" }}>
              <Icon.face size={18} /> Quét khuôn mặt
            </button>
          </div>
        )}

        {tab === "PIN" && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div className="pin-row">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`pin-dot${i < pin.length ? " filled" : ""}`} />
              ))}
            </div>
            <div className="keypad">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                <button key={i} className={`key-btn${k === "" ? " invisible" : ""}`} onClick={() => k && handleKey(k)}>
                  {k}
                </button>
              ))}
            </div>
            {pin.length === 6 && (
              <button className="btn btn-primary mt16" style={{ width: "100%" }} onClick={() => go("home")}>
                <Icon.checkCircle size={18} /> Xác nhận
              </button>
            )}
          </div>
        )}

        {tab === "OTP" && (
          <div style={{ paddingTop: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 14 }}>
              OTP đã gửi đến SĐT kết thúc <b>••97</b>
            </div>
            <input className="otp-input" type="tel" maxLength={6} placeholder="_ _ _ _ _ _" />
            <button className="btn btn-primary mt16" style={{ width: "100%" }} onClick={() => go("home")}>
              <Icon.checkCircle size={18} /> Xác nhận OTP
            </button>
          </div>
        )}
      </div>
      <ActionChips onSettings={go} />
      <div style={{ height: 16 }} />
    </div>
  );
}
