"use client";
// Quản lý vận hành (/user-management) — Phase 6 (§14).
// Dashboard hiệu suất + hàng đợi escalation (tiếp nhận/hoàn tất) + chỉ số lớp "An tâm Gia đình".
// Tái dùng design system của Admin Console (admin.css, scope .admin-console).
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import "../admin/admin.css";
import { dashboardApi, type Escalation } from "@/lib/dashboardApi";
import { KpiGrid, LoadingCard, OfflineCard, useAsync } from "../admin/parts";

// Trạng thái escalation do operator điều khiển (chồng lên dữ liệu nguồn).
type EscState = "queued" | "handling" | "done";
const ESC_META: Record<EscState, { label: string; cls: string }> = {
  queued: { label: "Trong hàng đợi", cls: "orange" },
  handling: { label: "Đang tiếp nhận", cls: "blue" },
  done: { label: "Đã hoàn tất", cls: "green" },
};

export default function UserManagementPage() {
  const monitor = useAsync(() => dashboardApi.monitor());
  const overview = useAsync(() => dashboardApi.overview());
  const family = useAsync(() => dashboardApi.family());

  const [override, setOverride] = useState<Record<string, EscState>>({});
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastOn(false), 2200);
  }, []);

  const loading = monitor.loading || overview.loading || family.loading;
  const offline = !monitor.data && !overview.data && !family.data;

  function refreshAll() { monitor.refresh(); overview.refresh(); family.refresh(); }

  function escState(e: Escalation): EscState {
    return override[e.code] ?? "queued";
  }
  function setEsc(e: Escalation, s: EscState, label: string) {
    setOverride((p) => ({ ...p, [e.code]: s }));
    toast(`${label} ${e.code}`);
  }

  const perfKpis = overview.data?.byPeriod?.today?.kpis ?? [];
  const escalations = monitor.data?.escalations ?? [];
  const queueLeft = escalations.filter((e) => escState(e) !== "done").length;

  return (
    <div className="admin-console" style={{ gridTemplateColumns: "1fr" }}>
      <main className="main">
        <div className="topbar">
          <div className="title">
            <h1>Quản lý vận hành</h1>
            <p>Hiệu suất trợ lý · hàng đợi chuyển tổng đài · chỉ số An tâm Gia đình.</p>
          </div>
          <div className="tools">
            <Link href="/admin" className="control" style={{ fontWeight: 700 }}>↗ Admin Console</Link>
            <button className="control" onClick={refreshAll}>↻ Làm mới</button>
          </div>
        </div>

        {loading && offline ? (
          <LoadingCard />
        ) : offline ? (
          <OfflineCard onRetry={refreshAll} />
        ) : (
          <>
            {/* Hiệu suất */}
            <h2 style={{ margin: "4px 0 12px", fontSize: 16 }}>Hiệu suất hôm nay</h2>
            {perfKpis.length > 0 ? <KpiGrid kpis={perfKpis} /> : <div className="card empty">Chưa có số liệu hiệu suất.</div>}

            {/* Escalation queue */}
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h2>Hàng đợi chuyển tổng đài <span className="badge orange">{queueLeft} đang chờ</span></h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Mã</th><th>Khách hàng</th><th>Lý do</th><th>Ưu tiên</th><th>Chờ</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                  <tbody>
                    {escalations.length === 0 ? (
                      <tr><td className="empty" colSpan={7}>Hàng đợi trống.</td></tr>
                    ) : escalations.map((e) => {
                      const s = escState(e);
                      const m = ESC_META[s];
                      return (
                        <tr key={e.code} style={{ cursor: "default" }}>
                          <td>{e.code}</td>
                          <td>{e.customer}</td>
                          <td>{e.reason}</td>
                          <td><span className={`badge ${e.priorityCls}`}>{e.priority}</span></td>
                          <td>{e.wait}</td>
                          <td><span className={`badge ${m.cls}`}>{m.label}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {s === "queued" && <button className="btn primary" onClick={() => setEsc(e, "handling", "📥 Đã tiếp nhận")}>Tiếp nhận</button>}
                              {s === "handling" && <button className="btn" onClick={() => setEsc(e, "done", "✓ Đã hoàn tất")}>Hoàn tất</button>}
                              {s === "done" && <button className="btn" onClick={() => setEsc(e, "queued", "↩ Đưa lại hàng đợi")}>Mở lại</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chỉ số lớp gia đình */}
            <h2 style={{ margin: "22px 0 12px", fontSize: 16 }}>Chỉ số lớp “An tâm Gia đình”</h2>
            {family.data?.kpis?.length ? <KpiGrid kpis={family.data.kpis} /> : <div className="card empty">Chưa có chỉ số gia đình.</div>}

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head"><h2>Cảnh báo gia đình gần đây <small style={{ color: "var(--muted)", fontWeight: 600 }}>(đẩy real-time 2 phía — BR-FAM-07)</small></h2></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Thời gian</th><th>Tài khoản cha mẹ</th><th>Loại</th><th>Mức</th><th>Đẩy tới</th><th>Độ trễ</th><th>Đọc</th></tr></thead>
                  <tbody>
                    {(family.data?.alerts ?? []).map((a, i) => (
                      <tr key={i} style={{ cursor: "default" }}>
                        <td><small>{a.time}</small></td>
                        <td>{a.dependent}</td>
                        <td>{a.type}</td>
                        <td><span className={`badge ${a.levelClass}`}>{a.level}</span></td>
                        <td>{a.channels}</td>
                        <td>{a.latency}</td>
                        <td><span className={`badge ${a.readClass ?? "gray"}`}>{a.read}</span></td>
                      </tr>
                    ))}
                    {(family.data?.alerts ?? []).length === 0 && <tr><td className="empty" colSpan={7}>Chưa có cảnh báo.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className={`toast ${toastOn ? "show" : ""}`}>{toastMsg}</div>
      </main>
    </div>
  );
}
