"use client";
// Customer mobile view (/user) — single phone shell that routes between the
// VoiceBank Inclusive cards/flows. Backend wiring (WS ui_card / action_required,
// §9) lands in later phases; this is the Phase 6 visual layer over mock data.
import { useState } from "react";
import Link from "next/link";
import { StatusBar, BottomNav } from "@/components/chrome";
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
import { Accessibility, type A11y } from "@/components/screens/Accessibility";
import type { Screen } from "@/lib/types";

export default function UserPage() {
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

  const screens: Record<Screen, React.ReactNode> = {
    home: <Home go={go} />,
    assistant: <Assistant go={go} />,
    history: <History go={go} />,
    bills: <Bills go={go} />,
    fraud: <Fraud go={go} />,
    savings: <Savings go={go} />,
    support: <Support go={go} />,
    goal: <Goal go={go} />,
    forecast: <Forecast go={go} />,
    transfer: <Transfer go={go} />,
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
        <main className="screen" key={screen === "assistant" ? "home" : screen}>
          <StatusBar light={darkStatus} />
          {screen === "assistant" ? screens["home"] : screens[screen]}
        </main>
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
            <Assistant go={go} />
          </div>
        )}
      </div>
    </div>
  );
}
