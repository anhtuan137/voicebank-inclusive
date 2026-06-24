"use client";
// Customer mobile view (/user) — single phone shell that routes between the
// VoiceBank Inclusive cards/flows. Backend wiring (WS ui_card / action_required,
// §9) lands in later phases; this is the Phase 6 visual layer over mock data.
import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBar, BottomNav } from "@/components/chrome";
import { Icon } from "@/components/Icon";
import { fraudAlert, vnd } from "@/lib/mock";
import { Home } from "@/components/screens/Home";
import { Assistant } from "@/components/screens/Assistant";
import { History } from "@/components/screens/History";
import { Bills } from "@/components/screens/Bills";
import { Fraud } from "@/components/screens/Fraud";
import { Savings } from "@/components/screens/Savings";
import { Support } from "@/components/screens/Support";
import { Goal } from "@/components/screens/Goal";
import { Forecast } from "@/components/screens/Forecast";
import { Transfer } from "@/components/screens/Transfer";
import { BillPay } from "@/components/screens/BillPay";
import { Family } from "@/components/screens/Family";
import { ActionChips } from "@/components/AssistantBits";
import { Accessibility, type A11y } from "@/components/screens/Accessibility";
import { SessionRating } from "@/components/SessionRating";
import { LiveDataProvider } from "@/lib/LiveData";
import type { Screen } from "@/lib/types";

export default function UserPage() {
  return (
    <LiveDataProvider>
      <UserShell />
    </LiveDataProvider>
  );
}

function UserShell() {
  const [screen, setScreen] = useState<Screen>("home");
  const [a11y, setA11y] = useState<A11y>({
    largeText: false,
    highContrast: false,
    screenReader: false,
    voiceControl: true,
    region: "Nam",
    speed: 55,
  });

  const go = (s: Screen) => setScreen(s);
  const darkStatus = screen === "home";

  // Thông báo CHỦ ĐỘNG (fraud_alert_flow §13): sau khi vào app một lát, Bot tự đẩy
  // cảnh báo phát hiện giao dịch rút tiền bất thường. Chạm → mở Trợ lý An với cảnh báo
  // hiển thị sẵn (prop launch="fraud"); Assistant tự dẫn dắt xác nhận → quét mặt → khoá thẻ.
  const [assistantLaunch, setAssistantLaunch] = useState<"fraud" | "transfer" | null>(null);
  const [fraudNotif, setFraudNotif] = useState(false);

  // Mở Trợ lý An và bắt đầu luồng chuyển tiền hội thoại (hỏi người nhận → số tiền → nội dung)
  // thay vì màn xác nhận tĩnh pre-fill sẵn người nhận.
  const goTransfer = () => { setAssistantLaunch("transfer"); go("assistant"); };
  useEffect(() => {
    const t = setTimeout(() => setFraudNotif(true), 3500);
    return () => clearTimeout(t);
  }, []);
  const openFraudAlert = () => {
    setFraudNotif(false);
    setAssistantLaunch("fraud");
    go("assistant");
  };

  // Đánh giá phiên (CSAT, §14): mọi thao tác hoàn tất qua Bot gọi rate(context) →
  // hiện overlay đánh giá ở cấp khung điện thoại, đóng xong quay về trang chủ.
  const [rateCtx, setRateCtx] = useState<string | null>(null);
  const rate = (context: string) => setRateCtx(context);

  const screens: Record<Screen, React.ReactNode> = {
    home: <Home go={go} onTransfer={goTransfer} />,
    assistant: <Assistant go={go} rate={rate} />,
    history: <History go={go} />,
    bills: <Bills go={go} />,
    fraud: <Fraud go={go} />,
    savings: <Savings go={go} rate={rate} />,
    support: <Support go={go} />,
    goal: <Goal go={go} rate={rate} />,
    forecast: <Forecast go={go} />,
    transfer: <Transfer go={go} rate={rate} />,
    billpay: <BillPay go={go} rate={rate} />,
    family: <Family go={go} />,
    accessibility: (
      <Accessibility go={go} a11y={a11y} setA11y={setA11y} />
    ),
  };

  const cls = [a11y.largeText && "a11y-large", a11y.highContrast && "a11y-contrast"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="stage">
      {/* View switcher — fixed top-right, always visible */}
      <Link
        href="/dashboard"
        style={{
          position: "fixed",
          top: 14,
          right: 16,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 13px",
          borderRadius: 99,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 2px 14px rgba(0,0,0,0.13)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/>
          <rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>
        </svg>
        Quản lý
      </Link>

      <div className={`phone ${cls}`}>
        {/* iPhone 14 Pro Max Dynamic Island */}
        <div className="dynamic-island" aria-hidden />

        <main
          className={`screen${screen === "home" ? " screen-home" : ""}`}
          key={screen === "assistant" ? "home" : screen}
        >
          <StatusBar light={darkStatus} />
          {screen === "assistant" ? screens["home"] : screens[screen]}
        </main>
        {/* Sticky accessibility shortcuts — pinned just above the bottom nav so
            they never scroll away (only on inner feature screens). */}
        {!["home", "assistant", "accessibility"].includes(screen) && (
          <div className="achips-bar">
            <ActionChips onSettings={go} />
          </div>
        )}
        {screen !== "assistant" && <BottomNav active={screen} onNav={go} />}
        {screen === "assistant" && (
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            <StatusBar />
            <Assistant
              go={go}
              rate={rate}
              launch={assistantLaunch}
              onLaunchHandled={() => setAssistantLaunch(null)}
            />
          </div>
        )}

        {/* Cảnh báo CHỦ ĐỘNG — popup giữa màn hình, nền home mờ đi (chỉ ở ngoài chat) */}
        {fraudNotif && screen !== "assistant" && (
          <div
            className="fade"
            role="dialog"
            aria-modal="true"
            aria-label="Cảnh báo giao dịch bất thường"
            style={{
              position: "absolute", inset: 0, zIndex: 58,
              display: "grid", placeItems: "center", padding: 20,
              background: "rgba(15,23,20,0.45)",
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            }}
          >
            <div style={{
              width: "100%", maxWidth: 320, borderRadius: 22,
              background: "#fff", padding: "22px 20px 18px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)", textAlign: "center",
            }}>
              <span style={{
                width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px",
                background: "rgba(225,29,72,0.12)", color: "var(--red, #e11d48)",
                display: "grid", placeItems: "center",
              }}>
                <Icon.shield size={30} />
              </span>
              <div style={{ fontWeight: 900, fontSize: 17 }}>Cảnh báo giao dịch bất thường</div>
              <div style={{ fontSize: 13, color: "var(--ink, #222)", marginTop: 8, lineHeight: 1.45 }}>
                Phát hiện giao dịch rút tiền <b>{vnd(fraudAlert.amount)}</b> tại {fraudAlert.place.split(" · ")[0]} lúc {fraudAlert.time}. Có phải bạn không?
              </div>
              <button
                className="btn btn-danger"
                style={{ width: "100%", marginTop: 18 }}
                onClick={openFraudAlert}
              >
                <Icon.shield size={17} /> Kiểm tra ngay
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setFraudNotif(false)}
              >
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        {/* Đánh giá phiên — overlay phủ toàn khung điện thoại (mọi luồng dùng chung) */}
        {rateCtx && (
          <SessionRating
            context={rateCtx}
            onClose={() => { setRateCtx(null); go("home"); }}
          />
        )}
      </div>
    </div>
  );
}
