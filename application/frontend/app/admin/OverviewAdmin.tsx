"use client";
// Tab "Tổng quan" (/admin) — KPI vận hành + cơ cấu yêu cầu + lý do chuyển tổng đài + cảnh báo.
import { dashboardApi } from "@/lib/dashboardApi";
import { KpiGrid, LoadingCard, OfflineCard, useAsync } from "./parts";

const MIX_COLORS = ["var(--g700)", "var(--g500)", "#2868d9", "#f59e0b", "#7c3aed"];

export default function OverviewAdmin() {
  const { data, loading, refresh } = useAsync(() => dashboardApi.overview());
  if (loading) return <LoadingCard />;
  if (!data) return <OfflineCard onRetry={refresh} />;

  const today = data.byPeriod?.today;
  const mix = today?.requestMix ?? [];

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>Tổng quan vận hành</h1>
          <p>Chỉ số tổng hợp của trợ lý VoiceBank — cập nhật theo ngày.</p>
        </div>
        <button className="control" onClick={refresh}>↻ Làm mới</button>
      </div>

      {data.liveKpis && data.liveKpis.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: "var(--g050)" }}>
          <h2 style={{ marginBottom: 12 }}>⚡ Trực tiếp (từ thao tác người dùng)</h2>
          <div className="grid4">
            {data.liveKpis.map((k) => (
              <div className="card kpi" key={k.label}>
                <div>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {today?.kpis && <KpiGrid kpis={today.kpis} />}

      <div className="family-layout">
        <div className="card">
          <div className="card-head"><h2>Cơ cấu yêu cầu</h2></div>
          {mix.map((m, i) => (
            <div className="bar-row" key={m.label}>
              <span className="bar-label">{m.label}</span>
              <div className="bar"><div className="bar-fill" style={{ width: `${m.pct}%`, background: MIX_COLORS[i % MIX_COLORS.length] }} /></div>
              <b className="bar-pct">{m.pct}%</b>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><h2>Lý do chuyển tổng đài</h2></div>
          {(data.escalationReasons ?? []).map((r, i) => (
            <div className="bar-row" key={r.label}>
              <span className="bar-label">{r.label}</span>
              <div className="bar"><div className="bar-fill" style={{ width: `${r.pct}%`, background: MIX_COLORS[i % MIX_COLORS.length] }} /></div>
              <b className="bar-pct">{r.pct}%</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Cảnh báo gần đây</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Thời gian</th><th>Mức</th><th>Loại</th><th>Nội dung</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {(data.alerts ?? []).map((a, i) => (
                <tr key={i} style={{ cursor: "default" }}>
                  <td><small>{a.time}</small></td>
                  <td><span className={`badge ${a.levelClass}`}>{a.level}</span></td>
                  <td>{a.type}</td>
                  <td>{a.content}</td>
                  <td><span className={`badge ${a.statusClass}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
