"use client";
// Bottom accessibility action chips — used on every feature screen (§12.2 "Thấu hiểu").
import { Icon } from "./Icon";
import type { Screen } from "@/lib/types";

const CHIPS: { label: string; icon: keyof typeof Icon }[] = [
  { label: "Nghe tóm tắt", icon: "speaker"  },
  { label: "Chữ lớn",      icon: "textsize" },
  { label: "Chế độ đọc",   icon: "read"     },
  { label: "Tương phản",   icon: "contrast" },
];

export function ActionChips({ onSettings }: { onSettings?: (s: Screen) => void }) {
  return (
    <div className="achips">
      {CHIPS.map((c) => {
        const I = Icon[c.icon];
        return (
          <button
            key={c.label}
            className="achip"
            onClick={() => onSettings?.("accessibility")}
          >
            <I size={15} style={{ color: "var(--g600)" }} /> {c.label}
          </button>
        );
      })}
    </div>
  );
}
