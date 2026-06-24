"use client";
// Thanh toán hóa đơn bằng giọng nói — bill_payment_flow (§13)
// Xác thực TUẦN TỰ đúng logic bảo mật (§7): chọn dịch vụ → xác nhận → PIN → OTP
// → (eKYC khuôn mặt 2 bước nếu số tiền > 10tr, BR-TRF-07) → thực hiện 1 lần.
// • PIN→OTP cưỡng chế bằng máy trạng thái (không bao giờ tới OTP nếu PIN chưa đạt).
// • Sai > 5 lần → khóa 15 phút + chuyển tổng đài viên (BR-AUTH-03/04/08).
// • PIN/OTP nhập dạng che; bot không bao giờ tiết lộ (BR-PIN-01).
// • execute idempotent: mã giao dịch chỉ sinh 1 lần.
import { useState, useEffect } from "react";
import { AppBar } from "../chrome";
import { AnBlock } from "../primitives";
import { FaceKyc } from "../FaceKyc";
import { Icon } from "../Icon";
import {
  billers,
  user,
  vnd,
  KYC_THRESHOLD,
  MAX_AUTH_ATTEMPTS,
  LOCK_MINUTES,
  OTP_TTL_SECONDS,
  type Biller,
} from "@/lib/mock";
import type { Screen } from "@/lib/types";

type Step = "catalog" | "review" | "pin" | "otp" | "face" | "done" | "locked";

// Demo: mọi mã 6 số đều hợp lệ, TRỪ "000000" — dùng để minh họa cơ chế khóa.
const isWrong = (code: string) => code === "000000";

export function BillPay({ go, rate }: { go: (s: Screen) => void; rate?: (ctx: string) => void }) {
  // Thanh toán hoàn tất qua Bot → mời đánh giá phiên (CSAT, §14).
  const finish = () => (rate ? rate("Thanh toán hoá đơn") : go("home"));
  const [step, setStep] = useState<Step>("catalog");
  const [selId, setSelId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [pinTries, setPinTries] = useState(0); // đếm riêng (BR-AUTH-05)
  const [otpTries, setOtpTries] = useState(0);
  const [err, setErr] = useState("");
  const [secs, setSecs] = useState(OTP_TTL_SECONDS);
  const [txnCode, setTxnCode] = useState<string | null>(null);

  const sel: Biller | undefined = billers.find((b) => b.id === selId);
  const needsFace = !!sel && sel.amount > KYC_THRESHOLD;

  // OTP đếm ngược 5 phút (BR-AUTH-02)
  useEffect(() => {
    if (step !== "otp") return;
    if (secs <= 0) return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, secs]);

  const reset = () => {
    setSelId(null); setPin(""); setOtp(""); setPinTries(0); setOtpTries(0);
    setErr(""); setSecs(OTP_TTL_SECONDS); setTxnCode(null);
    setStep("catalog");
  };

  const pick = (id: string) => { setSelId(id); setErr(""); setStep("review"); };

  // execute() — chạy đúng MỘT lần, sinh mã giao dịch (idempotency)
  const execute = () => {
    setTxnCode((prev) => prev ?? `BILL-${Date.now().toString().slice(-8)}`);
    setStep("done");
  };

  const submitPin = () => {
    if (pin.length < 6) return;
    if (isWrong(pin)) {
      const n = pinTries + 1;
      setPinTries(n);
      setPin("");
      if (n >= MAX_AUTH_ATTEMPTS) { setStep("locked"); return; }
      setErr(`Sai mã PIN. Bạn còn ${MAX_AUTH_ATTEMPTS - n} lần thử.`);
      return;
    }
    setErr(""); setStep("otp"); setSecs(OTP_TTL_SECONDS); // PIN đạt → mở OTP
  };

  const submitOtp = () => {
    if (otp.length < 6) return;
    if (secs <= 0) { setErr("Mã OTP đã hết hạn. Vui lòng gửi lại."); return; }
    if (isWrong(otp)) {
      const n = otpTries + 1;
      setOtpTries(n);
      setOtp("");
      if (n >= MAX_AUTH_ATTEMPTS) { setStep("locked"); return; }
      setErr(`Sai mã OTP. Bạn còn ${MAX_AUTH_ATTEMPTS - n} lần thử.`);
      return;
    }
    setErr("");
    if (needsFace) setStep("face"); // >10tr → eKYC trước khi thực hiện
    else execute();
  };

  const onBack = () => {
    setErr("");
    if (step === "catalog") return go("home");
    if (step === "review") return setStep("catalog");
    if (step === "pin") { setPin(""); return setStep("review"); }
    if (step === "otp") { setOtp(""); return setStep("pin"); }
    if (step === "face") return setStep("otp");
    return go("home");
  };

  const titles: Record<Step, string> = {
    catalog: "Thanh toán hóa đơn",
    review: "Xác nhận thanh toán",
    pin: "Xác thực · Bước 1/" + (needsFace ? "3" : "2"),
    otp: "Xác thực · Bước 2/" + (needsFace ? "3" : "2"),
    face: "Xác thực · Bước 3/3",
    done: "Thanh toán thành công",
    locked: "Tài khoản tạm khóa",
  };

  return (
    <div className="fade">
      <AppBar
        title={titles[step]}
        onBack={step === "done" || step === "locked" ? undefined : onBack}
        onClose={step === "done" ? () => { reset(); finish(); } : step === "locked" ? () => go("home") : undefined}
      />
      <div className="pad">
        {step === "catalog" && <Catalog onPick={pick} onVoice={() => pick("mv")} />}
        {step === "review" && sel && <Review sel={sel} needsFace={needsFace} onConfirm={() => setStep("pin")} />}
        {step === "pin" && (
          <PinPad
            sel={sel!} value={pin} setValue={setPin} err={err}
            onSubmit={submitPin}
          />
        )}
        {step === "otp" && (
          <OtpPad
            value={otp} setValue={setOtp} err={err} secs={secs}
            onResend={() => { setSecs(OTP_TTL_SECONDS); setErr(""); }}
            onSubmit={submitOtp}
          />
        )}
        {step === "face" && <FaceKyc onComplete={execute} />}
        {step === "done" && sel && (
          <Success sel={sel} code={txnCode!} usedFace={needsFace} onHome={() => { reset(); finish(); }} />
        )}
        {step === "locked" && <Locked onAgent={() => go("support")} onHome={() => { reset(); go("home"); }} />}
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}

/* ── Bước chọn dịch vụ (hỗ trợ giọng nói) ── */
function Catalog({ onPick, onVoice }: { onPick: (id: string) => void; onVoice: () => void }) {
  return (
    <>
      <AnBlock>
        Bạn muốn thanh toán hóa đơn nào? Hãy <b>chọn</b> hoặc nói tên dịch vụ nhé.
      </AnBlock>

      <button className="btn btn-primary mt12" onClick={onVoice}>
        <Icon.mic size={18} /> Nói: “Thanh toán vé xem phim”
      </button>

      <div className="sh">Dịch vụ &amp; hóa đơn</div>
      <div className="card" style={{ padding: "4px 14px" }}>
        {billers.map((b) => {
          const I = Icon[b.icon];
          return (
            <button key={b.id} className="lrow" style={{ width: "100%", textAlign: "left", background: "none" }} onClick={() => onPick(b.id)}>
              <span className="lrow-ico" style={{ background: b.color }}>
                <I size={22} />
              </span>
              <div className="lrow-main">
                <div className="lrow-title">{b.category}</div>
                <div className="lrow-sub">{b.provider} · {b.detail}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="lrow-amt">{vnd(b.amount)}</div>
                <Icon.chevron size={14} style={{ color: "var(--faint)", marginTop: 4, display: "block", marginLeft: "auto" }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Bước xác nhận hóa đơn ── */
function Review({ sel, needsFace, onConfirm }: { sel: Biller; needsFace: boolean; onConfirm: () => void }) {
  const I = Icon[sel.icon];
  const enough = user.balance >= sel.amount;
  return (
    <>
      <AnBlock>
        Xác nhận thanh toán <b>{vnd(sel.amount)}</b> cho <b>{sel.provider}</b>?
      </AnBlock>

      <div className="card mt12">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span className="lrow-ico" style={{ background: sel.color }}><I size={22} /></span>
          <div>
            <div style={{ fontWeight: 800 }}>{sel.category}</div>
            <div className="muted tiny">{sel.provider}</div>
          </div>
        </div>
        <div className="kv"><span className="kv-k"><Icon.doc size={13} /> Mã hóa đơn</span><span className="kv-v">{sel.code}</span></div>
        <div className="kv"><span className="kv-k"><Icon.note size={13} /> Chi tiết</span><span className="kv-v">{sel.detail}</span></div>
        <div className="kv"><span className="kv-k"><Icon.card size={13} /> Nguồn tiền</span><span className="kv-v">TK ••••{user.account.slice(-4)}</span></div>
        <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Số tiền</span><span className="kv-v" style={{ fontWeight: 800, fontSize: 18 }}>{vnd(sel.amount)}</span></div>
      </div>

      {needsFace && (
        <div className="callout warn mt12">
          <span className="ci"><Icon.face size={17} /></span>
          <span><b>Giao dịch giá trị lớn (&gt;10 triệu):</b> cần thêm xác thực khuôn mặt sau khi nhập PIN &amp; OTP.</span>
        </div>
      )}
      {!enough && (
        <div className="callout danger mt12">
          <span className="ci"><Icon.alert size={17} /></span>
          <span>Số dư khả dụng không đủ để thanh toán hóa đơn này.</span>
        </div>
      )}

      <button className="btn btn-primary mt16" disabled={!enough} onClick={onConfirm}>
        <Icon.lock size={18} /> Xác nhận &amp; xác thực
      </button>
      <div className="muted tiny" style={{ textAlign: "center", marginTop: 10 }}>
        Bảo mật theo thứ tự: PIN → OTP{needsFace ? " → Khuôn mặt" : ""}
      </div>
    </>
  );
}

/* ── Bàn phím số dùng chung ── */
function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="keypad">
      {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
        <button key={i} className={`key-btn${k === "" ? " invisible" : ""}`} onClick={() => k && onKey(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}

/* ── Bước PIN (che bằng chấm tròn, không hiển thị số) ── */
function PinPad({ sel, value, setValue, err, onSubmit }: {
  sel: Biller; value: string; setValue: (v: string) => void; err: string; onSubmit: () => void;
}) {
  const key = (k: string) => k === "⌫" ? setValue(value.slice(0, -1)) : value.length < 6 && setValue(value + k);
  return (
    <>
      <AnBlock>
        Vui lòng nhập <b>mã PIN 6 số</b> để xác thực thanh toán <b>{vnd(sel.amount)}</b>.
      </AnBlock>
      <div style={{ textAlign: "center", paddingTop: 14 }}>
        <div className="pin-row">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`pin-dot${i < value.length ? " filled" : ""}`} />
          ))}
        </div>
        {err && <div style={{ color: "var(--red)", fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>{err}</div>}
        <Keypad onKey={key} />
        <button className="btn btn-primary mt16" style={{ width: "100%" }} disabled={value.length < 6} onClick={onSubmit}>
          <Icon.checkCircle size={18} /> Xác nhận PIN
        </button>
        <div className="muted tiny" style={{ marginTop: 10 }}>
          An không bao giờ hỏi hay đọc mã PIN của bạn.
        </div>
      </div>
    </>
  );
}

/* ── Bước OTP (6 ô, có đếm ngược hết hạn) ── */
function OtpPad({ value, setValue, err, secs, onResend, onSubmit }: {
  value: string; setValue: (v: string) => void; err: string; secs: number; onResend: () => void; onSubmit: () => void;
}) {
  const key = (k: string) => k === "⌫" ? setValue(value.slice(0, -1)) : value.length < 6 && setValue(value + k);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const expired = secs <= 0;
  return (
    <>
      <AnBlock>
        Mã <b>OTP 6 số</b> đã gửi tới số điện thoại ••••{user.account.slice(-2)}. Mã hết hạn sau 5 phút.
      </AnBlock>
      <div style={{ textAlign: "center", paddingTop: 14 }}>
        <div className="pin-row">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="pin-dot" style={{
              width: 38, height: 46, borderRadius: 10, fontSize: 22, fontWeight: 800,
              display: "grid", placeItems: "center", color: "var(--ink)",
              border: `2px solid ${i === value.length ? "var(--g500)" : "var(--g200)"}`,
              background: "#fff",
            }}>{value[i] ?? ""}</span>
          ))}
        </div>
        <div className="tiny" style={{ marginTop: 8, color: expired ? "var(--red)" : "var(--muted)", fontWeight: 700 }}>
          {expired ? "Mã đã hết hạn" : <>Hết hạn sau <b>{mm}:{ss}</b></>}
        </div>
        {err && <div style={{ color: "var(--red)", fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>{err}</div>}
        <Keypad onKey={key} />
        <button className="btn btn-primary mt16" style={{ width: "100%" }} disabled={value.length < 6 || expired} onClick={onSubmit}>
          <Icon.checkCircle size={18} /> Xác nhận OTP
        </button>
        <button className="btn btn-ghost mt10" onClick={() => { onResend(); setValue(""); }}>
          <Icon.bell size={15} /> Gửi lại mã OTP
        </button>
      </div>
    </>
  );
}

/* ── Thành công ── */
function Success({ sel, code, usedFace, onHome }: { sel: Biller; code: string; usedFace: boolean; onHome: () => void }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 12 }}>
      <span style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Icon.checkCircle size={42} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 20 }}>Thanh toán thành công</div>
      <div style={{ fontWeight: 900, fontSize: 28, color: "var(--g700)", marginTop: 6 }}>{vnd(sel.amount)}</div>
      <div className="muted tiny" style={{ marginTop: 2 }}>{sel.category} · {sel.provider}</div>

      <div className="card mt16" style={{ textAlign: "left" }}>
        <div className="kv"><span className="kv-k"><Icon.doc size={13} /> Mã giao dịch</span><span className="kv-v">{code}</span></div>
        <div className="kv"><span className="kv-k"><Icon.clock size={13} /> Thời gian</span><span className="kv-v">14:20 · 26/05/2025</span></div>
        <div className="kv"><span className="kv-k"><Icon.card size={13} /> Nguồn tiền</span><span className="kv-v">TK ••••{user.account.slice(-4)}</span></div>
        <div className="kv"><span className="kv-k"><Icon.shield size={13} /> Xác thực</span><span className="kv-v" style={{ color: "var(--g700)", fontWeight: 700 }}>PIN · OTP{usedFace ? " · Khuôn mặt" : ""}</span></div>
      </div>

      <button className="btn btn-primary mt16" style={{ width: "100%" }} onClick={onHome}>
        <Icon.home size={18} /> Về trang chủ
      </button>
    </div>
  );
}

/* ── Khóa do sai PIN/OTP > 5 lần (BR-AUTH-03/04) ── */
function Locked({ onAgent, onHome }: { onAgent: () => void; onHome: () => void }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 16 }}>
      <span style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--red-bg)", color: "var(--red)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Icon.lock size={40} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 19 }}>Tài khoản tạm khóa</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.55, padding: "0 8px" }}>
        Bạn đã nhập sai quá <b>{MAX_AUTH_ATTEMPTS} lần</b>. Vì lý do an toàn, giao dịch
        bị tạm khóa <b>{LOCK_MINUTES} phút</b> và sẽ tự mở lại sau đó.
      </div>
      <button className="btn btn-primary mt16" style={{ width: "100%" }} onClick={onAgent}>
        <Icon.headset size={18} /> Gặp tổng đài viên hỗ trợ
      </button>
      <button className="btn btn-ghost mt10" onClick={onHome}>Về trang chủ</button>
    </div>
  );
}
