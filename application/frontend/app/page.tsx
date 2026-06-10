import Link from "next/link";

export default function Index() {
  return (
    <div className="stage" style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "48px 32px",
          background: "var(--card)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--s-pop)",
          minWidth: 300,
        }}
      >
        {/* Logo + brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--g500)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="white" />
              <path d="M4 19c0-3.866 3.582-7 8-7s8 3.134 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "var(--ink)", letterSpacing: -0.3 }}>
            VoiceBank Inclusive
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>VCB Digibank · Chọn phân hệ</span>
        </div>

        {/* Nav cards */}
        <Link href="/user" style={{ textDecoration: "none", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 20px",
              borderRadius: "var(--r-lg)",
              background: "var(--g050)",
              border: "1.5px solid var(--g200)",
              cursor: "pointer",
              transition: "box-shadow .15s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--g500)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="3" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="17" r="1.5" fill="white" />
                <path d="M9 7h6M9 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Người dùng</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Giao diện khách hàng · Trợ lý An
              </div>
            </div>
            <svg style={{ marginLeft: "auto", color: "var(--g500)" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        <Link href="/dashboard" style={{ textDecoration: "none", width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 20px",
              borderRadius: "var(--r-lg)",
              background: "#f0f4ff",
              border: "1.5px solid #c7d5f8",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#2f80ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="2" stroke="white" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" stroke="white" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>Quản lý</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Admin console · Giám sát & báo cáo
              </div>
            </div>
            <svg style={{ marginLeft: "auto", color: "#2f80ed" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
