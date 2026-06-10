"use client";
// Hỗ trợ tiếp cận — accessibility settings panel  (Sample 03_50_03_9)
import { AppBar } from "../chrome";
import { Toggle } from "../primitives";
import { Icon } from "../Icon";
import type { Screen } from "@/lib/types";

export interface A11y {
  largeText: boolean;
  highContrast: boolean;
  screenReader: boolean;
  voiceControl: boolean;
  region: "Nam" | "Bắc" | "Trung";
  speed: number;
}

const TOGGLES: { key: keyof A11y; icon: keyof typeof Icon; t: string; s: string }[] = [
  { key: "largeText",    icon: "textsize", t: "Chữ lớn",               s: "Tăng cỡ chữ toàn ứng dụng"      },
  { key: "highContrast", icon: "contrast", t: "Tương phản cao",         s: "Tăng độ rõ cho nội dung"         },
  { key: "screenReader", icon: "read",     t: "Đọc nội dung màn hình", s: "An đọc to nội dung hiển thị"     },
  { key: "voiceControl", icon: "voice",    t: "Điều khiển giọng nói",  s: "Thao tác không cần chạm"          },
];

const MODES = [
  { icon: "user"   as const, label: "Người cao tuổi"         },
  { icon: "eyeAcc" as const, label: "Người khiếm thị"        },
  { icon: "hand"   as const, label: "Ít quen công nghệ"      },
  { icon: "check"  as const, label: "Trải nghiệm chuẩn"      },
];

const REGIONS = ["Nam", "Bắc", "Trung"] as const;

export function Accessibility({
  go,
  a11y,
  setA11y,
}: {
  go: (s: Screen) => void;
  a11y: A11y;
  setA11y: (v: A11y) => void;
}) {
  const set = <K extends keyof A11y>(k: K, v: A11y[K]) => setA11y({ ...a11y, [k]: v });

  return (
    <div className="fade">
      <AppBar title="Hỗ trợ tiếp cận" onBack={() => go("home")} />
      <div className="pad">

        {/* region + speed */}
        <div className="card">
          <div className="srow">
            <span className="srow-ico"><Icon.globe size={19} /></span>
            <div className="srow-main">
              <span className="srow-title" style={{ flex: 1 }}>Giọng đọc vùng miền</span>
              <div style={{ display: "flex", gap: 6 }}>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    className={`chip${a11y.region === r ? " on" : ""}`}
                    style={{ fontSize: 11.5, padding: "4px 10px" }}
                    onClick={() => set("region", r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="srow" style={{ marginTop: 12 }}>
            <span className="srow-ico"><Icon.gauge size={19} /></span>
            <div className="srow-main">
              <span className="srow-title" style={{ flex: 1 }}>Tốc độ đọc</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range" min={20} max={100} value={a11y.speed}
                  style={{ width: 80 }}
                  onChange={(e) => set("speed", Number(e.target.value))}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--g600)", minWidth: 28, textAlign: "right" }}>
                  {a11y.speed}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* toggles */}
        <div className="sh">Tùy chỉnh hiển thị &amp; giọng nói</div>
        <div className="card">
          {TOGGLES.map((row) => {
            const I = Icon[row.icon];
            return (
              <div key={row.key} className="srow">
                <span className="srow-ico"><I size={19} /></span>
                <div className="srow-main">
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{row.t}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>{row.s}</div>
                  </div>
                </div>
                <Toggle on={Boolean(a11y[row.key])} onChange={() => set(row.key, !a11y[row.key] as never)} />
              </div>
            );
          })}
        </div>

        {/* inclusive modes */}
        <div className="sh">Chế độ Inclusive</div>
        <div className="mode-grid">
          {MODES.map((m) => {
            const I = Icon[m.icon];
            return (
              <div key={m.label} className="mode-btn">
                <I size={22} />
                <span>{m.label}</span>
              </div>
            );
          })}
        </div>

        <div className="btn-row mt16">
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => go("home")}>
            <Icon.check size={18} /> Lưu cài đặt
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={() =>
              setA11y({ largeText: false, highContrast: false, screenReader: false, voiceControl: true, region: "Nam", speed: 55 })
            }
          >
            <Icon.history size={16} /> Khôi phục mặc định
          </button>
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
