"use client";
import { Icon } from "./Icon";

/* ── Robot mascot "An" ── */
export function Robot({ size = "" }: { size?: "lg" | "sm" | "" }) {
  return (
    <div className={`robot ${size}`} aria-hidden>
      <span className="ant" />
      <div className="visor">
        <span className="eye" />
        <span className="eye" />
      </div>
    </div>
  );
}

/* ── Animated waveform ── */
export function Waveform({ idle = false, bars = 20 }: { idle?: boolean; bars?: number }) {
  // deterministic heights — same on server + client (no Math.random)
  const hs = Array.from({ length: bars }, (_, i) =>
    5 + Math.round(14 * Math.abs(Math.sin(i * 1.37 + 0.8)))
  );
  return (
    <div className={`wave${idle ? " idle" : ""}`} aria-hidden>
      {hs.map((h, i) => (
        <span key={i} style={{ height: h, animationDelay: `${(i % 6) * 0.1}s` }} />
      ))}
    </div>
  );
}

/* ── Voice bar (waveform + speaker) ── */
export function VoiceBar({ idle = false }: { idle?: boolean }) {
  return (
    <div className="voicebar">
      <Waveform idle={idle} bars={16} />
      <span style={{ color: "var(--g600)", flexShrink: 0 }}>
        <Icon.speaker size={17} />
      </span>
    </div>
  );
}

/* ── "An" chat block (header of every feature screen) ── */
export function AnBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="an-block">
      <Robot size="lg" />
      <div className="an-inner">
        <div className="an-label">
          <span className="an-label-dot">
            <span
              style={{
                width: 12, height: 12, borderRadius: "50%",
                background: "linear-gradient(135deg,var(--g400),var(--g700))",
                display: "inline-block", flexShrink: 0,
              }}
            />
            An
          </span>
        </div>
        <div className="an-bubble">{children}</div>
        <VoiceBar />
      </div>
    </div>
  );
}

/* ── Toggle ── */
export function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <button
      className={`toggle${on ? " on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={onChange}
    >
      <span className="knob" />
    </button>
  );
}

/* ── SVG Donut chart ── */
export function Donut({
  segments,
  cLabel,
  cValue,
  size = 116,
}: {
  segments: { pct: number; color: string }[];
  cLabel?: string;
  cValue?: string;
  size?: number;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#edf2ee" strokeWidth="11" />
        {segments.map((s, i) => {
          const len = (s.pct / 100) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none" stroke={s.color} strokeWidth="11"
              strokeDasharray={dash} strokeDashoffset={-off}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          );
          off += len;
          return el;
        })}
      </svg>
      {(cLabel || cValue) && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          {cLabel && <div style={{ fontSize: 10, color: "var(--muted)" }}>{cLabel}</div>}
          {cValue && <div style={{ fontSize: 14, fontWeight: 800 }}>{cValue}</div>}
        </div>
      )}
    </div>
  );
}

/* ── Progress ring ── */
export function Ring({ pct, sub = "đã đạt" }: { pct: number; sub?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const len = (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
      <svg viewBox="0 0 104 104" width={104} height={104}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="#e2f5ea" strokeWidth="9" />
        <circle
          cx="52" cy="52" r={r}
          fill="none" stroke="url(#rg)" strokeWidth="9"
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
        />
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#30c074" />
            <stop offset="100%" stopColor="#0d7840" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--g700)", lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Sparkline (forecast curve) ── */
export function Sparkline({ points, height = 80 }: { points: number[]; height?: number }) {
  const W = 320;
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);
  const coords = points.map((p, i) => [
    i * step,
    height - 10 - ((p - min) / span) * (height - 22),
  ]);
  const line = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${height} L0,${height} Z`;
  const [lx, ly] = coords[coords.length - 1];
  // build y-axis labels
  const ticks = [max, (max + min) / 2, min].map((v) => `${v.toFixed(1)}`);
  return (
    <div style={{ position: "relative" }}>
      {/* y-axis ticks */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingRight: 4 }}>
        {ticks.map((t, i) => (
          <span key={i} style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{t} tr</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(26,168,94,.25)" />
            <stop offset="100%" stopColor="rgba(26,168,94,0)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sg)" />
        <path d={line} fill="none" stroke="var(--g600)" strokeWidth="2.5" />
        <circle cx={lx} cy={ly} r="5" fill="var(--g700)" />
        <circle cx={lx} cy={ly} r="10" fill="none" stroke="var(--g300)" strokeWidth="2" />
      </svg>
    </div>
  );
}
