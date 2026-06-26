"use client";
// Tab "Cài đặt" (/admin) — cấu hình bảo mật (PII/audit/escalation) + vai trò RBAC (§15).
import { useEffect, useState } from "react";
import { dashboardApi, type SettingsData } from "@/lib/dashboardApi";
import { LoadingCard, OfflineCard, useAsync } from "./parts";

export default function SettingsAdmin({ toast }: { toast: (msg: string) => void }) {
  const { data, loading, refresh } = useAsync(() => dashboardApi.settings());
  const [security, setSecurity] = useState<SettingsData["security"]>([]);

  useEffect(() => { if (data) setSecurity(data.security); }, [data]);

  if (loading && !data) return <LoadingCard />;
  if (!data) return <OfflineCard onRetry={refresh} />;

  async function toggle(name: string, on: boolean) {
    setSecurity((prev) => prev.map((s) => (s.name === name ? { ...s, on } : s)));
    const ok = await dashboardApi.toggleSecurity(name, on);
    toast(ok ? `✓ ${on ? "Bật" : "Tắt"} "${name}"` : `✓ ${on ? "Bật" : "Tắt"} "${name}" (cục bộ — bật Postgres để lưu)`);
  }

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>Cài đặt &amp; phân quyền</h1>
          <p>Bảo mật dữ liệu (NĐ13/QĐ2345) &amp; vai trò vận hành (RBAC).</p>
        </div>
        <button className="control" onClick={refresh}>↻ Làm mới</button>
      </div>

      <div className="card">
        <div className="card-head"><h2>Bảo mật &amp; tuân thủ</h2></div>
        {security.map((s) => (
          <div className="access-item" key={s.name} style={{ marginBottom: 10 }}>
            <div>
              <b>{s.name}</b><br />
              <small>{s.desc}</small>
            </div>
            <button
              className={`toggle ${s.on ? "on" : ""}`}
              role="switch"
              aria-checked={s.on}
              onClick={() => toggle(s.name, !s.on)}
            >
              <span className="knob" />
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Vai trò (RBAC)</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vai trò</th><th>Mô tả</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {data.roles.map((r) => (
                <tr key={r.name} style={{ cursor: "default" }}>
                  <td><b>{r.name}</b></td>
                  <td><small>{r.desc}</small></td>
                  <td><span className={`badge ${r.cls}`}>{r.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
