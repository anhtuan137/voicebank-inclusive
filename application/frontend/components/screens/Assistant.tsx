"use client";
// Trợ lý An — main voice/chat interface  (Sample 03_50_03_10, 03_50_03_11)
import { useState, useRef } from "react";
import { AppBar } from "../chrome";
import { Robot, Waveform } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { Icon } from "../Icon";
import type { Screen } from "@/lib/types";

interface Msg {
  id: number;
  from: "user" | "an";
  text: string;
}

const WELCOME: Msg[] = [
  { id: 0, from: "an", text: "Chào Anh Tuấn! Tôi là An, trợ lý tài chính cá nhân của bạn. Hôm nay tôi có thể giúp gì?" },
];

const SUGGESTIONS: { label: string; to: Screen }[] = [
  { label: "Thanh toán hóa đơn", to: "billpay"  },
  { label: "Chuyển tiền",        to: "transfer" },
  { label: "Dự báo cuối tháng",  to: "forecast" },
  { label: "Mở tiết kiệm",       to: "savings"  },
];

export function Assistant({ go }: { go: (s: Screen) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(WELCOME);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    const id = Date.now();
    setMsgs((prev) => [
      ...prev,
      { id, from: "user", text },
      { id: id + 1, from: "an", text: getReply(text) },
    ]);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const handleMic = () => {
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    setTimeout(() => {
      setListening(false);
      send("Số dư tài khoản của tôi là bao nhiêu?");
    }, 1800);
  };

  return (
    <div className="fade" style={{
      display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
      background: "linear-gradient(180deg, #edf2ee 0%, #f5fbf7 40%, #ffffff 100%)",
    }}>
      <AppBar title="Trợ lý An" onBack={() => go("home")} />

      {/* robot avatar */}
      <div className="an-hero">
        <div className={`an-orb${listening ? " pulse" : ""}`}>
          <Robot size="lg" />
        </div>
        <div className="an-status">
          {listening
            ? <><Waveform bars={14} /><span className="muted tiny"> Đang nghe…</span></>
            : <span className="muted tiny">An đang chờ câu hỏi của bạn</span>
          }
        </div>
      </div>

      {/* chat area */}
      <div className="chat-scroll">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble-row ${m.from}`}>
            {m.from === "an" && (
              <span className="bubble-av">
                <Icon.sparkle size={14} style={{ color: "#fff" }} />
              </span>
            )}
            <div className={`bubble ${m.from}`}>{m.text}</div>
          </div>
        ))}
        {msgs.length <= 2 && (
          <div className="sugg-row">
            {SUGGESTIONS.map((s) => (
              <button key={s.label} className="sugg-chip" onClick={() => go(s.to)}>{s.label}</button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input bar */}
      <div className="chat-bar">
        <button
          className={`mic-btn${listening ? " active" : ""}`}
          onClick={handleMic}
          aria-label={listening ? "Dừng nghe" : "Bắt đầu nghe"}
        >
          <Icon.mic size={22} />
        </button>
        <input
          className="chat-input"
          type="text"
          placeholder="Nhập câu hỏi…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <button className="send-btn" onClick={() => send(input)} disabled={!input.trim()}>
          <Icon.send size={20} />
        </button>
      </div>

      <ActionChips onSettings={go} />
      <div style={{ height: 8 }} />
    </div>
  );
}

function getReply(q: string): string {
  const lq = q.toLowerCase();
  if (lq.includes("số dư")) return "Số dư hiện tại của bạn là 14.650.000đ.";
  if (lq.includes("chi tiêu")) return "Tuần này bạn đã chi 2.316.000đ, cao hơn tuần trước 8%.";
  if (lq.includes("hóa đơn")) return "Bạn có 3 hóa đơn sắp đến hạn. Tổng cộng 1.865.000đ.";
  if (lq.includes("dự báo")) return "Cuối tháng tài khoản dự kiến còn 2.450.000đ. Nên giảm chi tiêu ăn uống.";
  if (lq.includes("chuyển tiền")) return "Bạn muốn chuyển tiền đến ai? Hãy nói tên hoặc số tài khoản.";
  return "Tôi đang xử lý câu hỏi của bạn. Bạn có thể hỏi về số dư, chi tiêu, hóa đơn hoặc tiết kiệm.";
}
