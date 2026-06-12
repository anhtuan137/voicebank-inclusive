"use client";
// Cảnh báo an toàn — fraud_alert_flow (detect_fraud §12)  (Sample 03_50_03_3)
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { Icon } from "../Icon";
import { fraudAlert, vnd } from "@/lib/mock";
import type { Screen } from "@/lib/types";

export function Fraud({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="fade">
      <AppBar title="Cảnh báo an toàn" onClose={() => go("home")} />
      <div className="pad">
        <div className="callout warn">
          <span className="ci"><Icon.shield size={18} /></span>
          <span>
            <b>Phát hiện giao dịch bất thường.</b> Hệ thống đã chủ động cảnh báo để bảo vệ bạn.
          </span>
        </div>

        <div className="mt12">
          <AnBlock>
            Tôi vừa phát hiện một giao dịch trị giá <b>{vnd(fraudAlert.amount)}</b> từ thiết bị mới.
          </AnBlock>
        </div>

        <div className="card">
          <KV icon="store"  k="Nhà cung cấp" v={fraudAlert.merchant} />
          <KV icon="wallet" k="Số tiền"       v={vnd(fraudAlert.amount)} bold />
          <KV icon="clock"  k="Thời gian"     v={fraudAlert.time} />
          <KV icon="pin"    k="Địa điểm"      v={fraudAlert.place} />
          <KV icon="card"   k="Thiết bị"      v={fraudAlert.device} />
        </div>

        <div className="sh">Đánh giá rủi ro</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {fraudAlert.risks.map((r) => (
            <span key={r} className="pill orange">
              <Icon.alert size={11} /> {r}
            </span>
          ))}
        </div>

        <div className="mt16" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary">
            <Icon.checkCircle size={19} /> Đây là giao dịch của tôi
          </button>
          <button className="btn btn-ghost">
            <Icon.close size={17} /> Không phải của tôi
          </button>
          <button className="btn btn-danger" onClick={() => go("support")}>
            <Icon.lock size={17} /> Khóa thẻ tạm thời
          </button>
        </div>

        <div className="sh">An khuyến nghị</div>
        <div className="card">
          {[
            "Xác minh bằng khuôn mặt khi tiếp tục",
            "Đặt mật khẩu nghi ngờ bị lộ thông tin",
            "Liên hệ tổng đài 24/7 để được hỗ trợ",
          ].map((t) => (
            <div key={t} className="lrow" style={{ padding: "10px 2px" }}>
              <Icon.check size={17} style={{ color: "var(--g600)", flexShrink: 0 }} />
              <div className="lrow-main">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
              </div>
              <Icon.chevron size={14} style={{ color: "var(--faint)" }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}

function KV({ icon, k, v, bold }: { icon: keyof typeof Icon; k: string; v: string; bold?: boolean }) {
  const I = Icon[icon];
  return (
    <div className="kv">
      <span className="kv-k">
        <I size={14} style={{ color: "var(--g600)" }} /> {k}
      </span>
      <span className="kv-v" style={bold ? { color: "var(--red)", fontSize: 16 } : undefined}>{v}</span>
    </div>
  );
}
