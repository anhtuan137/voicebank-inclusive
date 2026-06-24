// Lightweight inline SVG icon set (stroke-based, currentColor).
// Keeps the bundle dependency-free per BUILD_SPEC tech stack.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...p }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...p,
  };
}

export const Icon = {
  back: (p: P) => (
    <svg {...base(p)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  bell: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10.5 21a1.5 1.5 0 003 0" />
    </svg>
  ),
  power: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3v9" />
      <path d="M6.6 6.6a8 8 0 1010.8 0" />
    </svg>
  ),
  close: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  mic: (p: P) => (
    <svg {...base(p)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </svg>
  ),
  speaker: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 9a3 3 0 010 6M18.5 7a6 6 0 010 10" />
    </svg>
  ),
  send: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 12l16-8-6 16-3-7-7-1z" />
    </svg>
  ),
  qr: (p: P) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3M21 14v7h-7" />
    </svg>
  ),
  eye: (p: P) => (
    <svg {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  history: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v4h4" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  card: (p: P) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  ),
  home: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  ),
  grid: (p: P) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  settings: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.4L4.1 11a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5a7 7 0 00.1-1z" />
    </svg>
  ),
  chat: (p: P) => (
    <svg {...base(p)}>
      <path d="M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z" />
    </svg>
  ),
  store: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 4h16l-1 5H5L4 4z" />
      <path d="M5 9v11h14V9M9 20v-5h6v5" />
    </svg>
  ),
  transfer: (p: P) => (
    <svg {...base(p)}>
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  ),
  sim: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 3h8l4 4v14H6z" />
      <rect x="9" y="12" width="6" height="6" rx="1" />
    </svg>
  ),
  piggy: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 12a6 6 0 016-6h5a6 6 0 016 6 5 5 0 01-2 4v3h-3v-2H9v2H6v-3a6 6 0 01-3-4z" />
      <circle cx="15.5" cy="11" r="1" />
    </svg>
  ),
  phone: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z" />
    </svg>
  ),
  ticket: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2 2 2 0 000 4 2 2 0 010 4H5a2 2 0 01-2-2 2 2 0 000-4z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </svg>
  ),
  calendar: (p: P) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  trendUp: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 7v5h-5" />
    </svg>
  ),
  trendDown: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 17v-5h-5" />
    </svg>
  ),
  shield: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  alert: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  lock: (p: P) => (
    <svg {...base(p)}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  ),
  check: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 13l4 4 10-11" />
    </svg>
  ),
  checkCircle: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  ),
  face: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
      <circle cx="9.5" cy="11" r="1" />
      <circle cx="14.5" cy="11" r="1" />
      <path d="M9 15a4 4 0 006 0" />
    </svg>
  ),
  key: (p: P) => (
    <svg {...base(p)}>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M18 18l2-2" />
    </svg>
  ),
  flame: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3c1 3-2 4-2 7a2 2 0 004 0c0-1 0-1.5-.5-2.5 2 1.5 3.5 3.5 3.5 6a5 5 0 01-10 0c0-3.5 4-4.5 5-10.5z" />
    </svg>
  ),
  trophy: (p: P) => (
    <svg {...base(p)}>
      <path d="M7 4h10v4a5 5 0 01-10 0V4z" />
      <path d="M7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3M9 16h6M10 16v3M14 16v3M8 21h8" />
    </svg>
  ),
  globe: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  ),
  gauge: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 18a8 8 0 1116 0" />
      <path d="M12 18l4-5" />
    </svg>
  ),
  textsize: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 18l4-11 4 11M5.5 14h5M14 18l3-8 3 8M15 15h4" />
    </svg>
  ),
  contrast: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 000-18z" fill="currentColor" />
    </svg>
  ),
  read: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 5h7v15H4zM20 5h-7v15h7z" />
      <path d="M4 5a3 3 0 017 0M20 5a3 3 0 00-7 0" />
    </svg>
  ),
  voice: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 12h2l2-5 3 12 3-16 3 12 2-3h3" />
    </svg>
  ),
  doc: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </svg>
  ),
  chevron: (p: P) => (
    <svg {...base(p)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  plus: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  filter: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
    </svg>
  ),
  sparkle: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  ),
  // Star — pass fill="currentColor" để vẽ sao đặc (đã chọn); mặc định viền rỗng.
  star: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" />
    </svg>
  ),
  target: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  wallet: (p: P) => (
    <svg {...base(p)}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12h3M3 9h18" />
    </svg>
  ),
  clock: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  pin: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  user: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  ),
  bank: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 9l9-5 9 5M5 9v9M19 9v9M9 9v9M15 9v9M3 21h18" />
    </svg>
  ),
  note: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 4h14v16H5z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  ),
  droplet: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3c4 5 6 7 6 10a6 6 0 01-12 0c0-3 2-5 6-10z" />
    </svg>
  ),
  bolt: (p: P) => (
    <svg {...base(p)}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  wifi: (p: P) => (
    <svg {...base(p)}>
      <path d="M2 8a16 16 0 0120 0M5 12a11 11 0 0114 0M8 16a6 6 0 018 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  eyeAcc: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  hand: (p: P) => (
    <svg {...base(p)}>
      <path d="M8 13V5a1.5 1.5 0 013 0v6M11 11V4a1.5 1.5 0 013 0v7M14 11V6a1.5 1.5 0 013 0v8a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012-2l2 2" />
    </svg>
  ),
  headset: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 13v-1a8 8 0 0116 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19a4 4 0 01-4 3h-3" />
    </svg>
  ),
  info: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  ),
  copy: (p: P) => (
    <svg {...base(p)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  pencil: (p: P) => (
    <svg {...base(p)}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2 2 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  users: (p: P) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0111 0" />
      <path d="M16 5.3a3.2 3.2 0 010 5.9M17 15.4a5.5 5.5 0 013.5 4.6" />
    </svg>
  ),
};

export type IconName = keyof typeof Icon;
