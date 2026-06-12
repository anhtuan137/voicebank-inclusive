"use client";
// An tâm Gia đình — family_link_flow → ui_card{family}  (§3.5 / §4.6c)
// Góc nhìn người trẻ (khách hàng): liên kết tài khoản người thân, nhận kết quả &
// cảnh báo. "Nguyên tắc một trục" — người trẻ chỉ NHẬN thông báo, không nhận
// quyền; người thân đồng ý bằng giọng nói + eKYC và thu hồi được bất kỳ lúc nào.
import { useState } from "react";
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { Icon } from "../Icon";
import { familyMembers, familyAlerts, type FamilyStatus } from "@/lib/mock";
import type { Screen } from "@/lib/types";

const STATUS: Record<FamilyStatus, { label: string; pill: string; icon: keyof typeof Icon }> = {
  active: { label: "Đã kích hoạt", pill: "green", icon: "checkCircle" },
  pending: { label: "Chờ xác nhận", pill: "orange", icon: "clock" },
  revoked: { label: "Đã thu hồi", pill: "red", icon: "close" },
};

const ALERT_STYLE = {
  result: { icon: "checkCircle" as const, color: "var(--g600)", bg: "var(--g100)" },
  fraud: { icon: "shield" as const, color: "#d97706", bg: "#fff2dc" },
  summary: { icon: "wallet" as const, color: "#2f80ed", bg: "#e8f1fd" },
};

// Các bước của luồng "Liên kết & cảnh báo gia đình" — nguyên tắc một trục (§4.6c)
const LINK_STEPS = [
  { icon: "mic" as const, title: "Bạn yêu cầu bằng giọng nói", desc: "“Liên kết tài khoản cho mẹ” → hệ thống tạo liên kết chờ đồng ý." },
  { icon: "face" as const, title: "Người thân xác nhận", desc: "Cha mẹ đồng ý bằng giọng nói + eKYC (liveness + so khớp khuôn mặt)." },
  { icon: "bell" as const, title: "Kết quả quay về máy bạn", desc: "Liên kết kích hoạt; mọi cảnh báo & kết quả được đẩy về cho bạn." },
];

export function Family({ go }: { go: (s: Screen) => void }) {
  const [linking, setLinking] = useState(false);
  const [sent, setSent] = useState(false);

  const activeCount = familyMembers.filter((m) => m.status === "active").length;

  return (
    <div className="fade">
      <AppBar title="An tâm Gia đình" onBack={() => go("home")} />
      <div className="pad">
        <AnBlock>
          Bạn đang bảo vệ tài chính cho <b>{activeCount} người thân</b>. Mẹ vừa tự
          khóa thẻ an toàn — mọi việc đều ổn nhé!
        </AnBlock>

        {/* Danh sách người thân được liên kết */}
        <div className="sh mt12">Người thân được liên kết</div>
        <div className="card" style={{ padding: "4px 14px" }}>
          {familyMembers.map((m) => {
            const s = STATUS[m.status];
            const S = Icon[s.icon];
            return (
              <div key={m.id} className="lrow">
                <span className="lrow-ico" style={{ background: "var(--g050)", color: "var(--g700)" }}>
                  <Icon.user size={22} />
                </span>
                <div className="lrow-main">
                  <div className="lrow-title">
                    {m.relation} · {m.name}
                  </div>
                  <div className="lrow-sub">
                    Tài khoản ••••{m.phone4}
                    {m.consent ? ` · ${m.consent}` : " · Đang chờ eKYC"}
                  </div>
                </div>
                <span className={`pill ${s.pill}`}>
                  <S size={11} /> {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA liên kết người thân mới + luồng một trục */}
        {!linking ? (
          <button className="btn btn-primary mt12" onClick={() => setLinking(true)}>
            <Icon.plus size={17} /> Liên kết người thân mới
          </button>
        ) : (
          <div className="card mt12" style={{ padding: 16 }}>
            {!sent ? (
              <>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                  Liên kết hoạt động thế nào?
                </div>
                <div className="muted tiny" style={{ marginBottom: 12 }}>
                  Nguyên tắc một trục — an toàn cho cả hai thế hệ
                </div>
                {LINK_STEPS.map((st, i) => {
                  const I = Icon[st.icon];
                  return (
                    <div key={st.title} className="lrow" style={{ alignItems: "flex-start" }}>
                      <span
                        className="lrow-ico"
                        style={{
                          background: "linear-gradient(135deg,var(--g400),var(--g700))",
                          color: "#fff",
                          position: "relative",
                        }}
                      >
                        <I size={20} />
                        <span
                          style={{
                            position: "absolute", top: -4, right: -4,
                            width: 18, height: 18, borderRadius: "50%",
                            background: "#fff", color: "var(--g700)",
                            fontSize: 11, fontWeight: 800,
                            display: "grid", placeItems: "center",
                            border: "1.5px solid var(--g200)",
                          }}
                        >
                          {i + 1}
                        </span>
                      </span>
                      <div className="lrow-main">
                        <div className="lrow-title">{st.title}</div>
                        <div className="lrow-sub" style={{ whiteSpace: "normal" }}>{st.desc}</div>
                      </div>
                    </div>
                  );
                })}
                <button className="btn btn-primary mt12" onClick={() => setSent(true)}>
                  <Icon.send size={16} /> Gửi yêu cầu tới người thân
                </button>
                <button className="btn btn-ghost mt10" onClick={() => setLinking(false)}>
                  Để sau
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <span
                  style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "var(--g100)", color: "var(--g700)",
                    display: "grid", placeItems: "center", margin: "0 auto 12px",
                  }}
                >
                  <Icon.checkCircle size={30} />
                </span>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Đã gửi yêu cầu liên kết</div>
                <div className="muted tiny" style={{ marginTop: 6, lineHeight: 1.5 }}>
                  Người thân cần xác nhận bằng <b>giọng nói + eKYC</b> trên thiết bị của
                  họ. Bạn sẽ nhận kết quả ngay khi liên kết được kích hoạt.
                </div>
                <button
                  className="btn btn-soft mt16"
                  onClick={() => { setSent(false); setLinking(false); }}
                >
                  Xong
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cảnh báo & kết quả — vòng lặp đóng ở người trẻ */}
        <div className="sh">Cảnh báo & kết quả gần đây</div>
        <div className="card" style={{ padding: "4px 14px" }}>
          {familyAlerts.map((a) => {
            const st = ALERT_STYLE[a.kind];
            const I = Icon[st.icon];
            return (
              <div key={a.id} className="lrow" style={{ alignItems: "flex-start" }}>
                <span className="lrow-ico" style={{ background: st.bg, color: st.color }}>
                  <I size={20} />
                </span>
                <div className="lrow-main">
                  <div className="lrow-sub" style={{ whiteSpace: "normal", color: "var(--ink)", fontWeight: 600, fontSize: 13 }}>
                    {a.text}
                  </div>
                  <div className="lrow-sub" style={{ marginTop: 3 }}>
                    {a.who} · {a.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
