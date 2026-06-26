"use client";
// Tab "Báo cáo" (/admin) — analytics: KPI tăng trưởng + chỉ tiêu mục tiêu + insight.
import { dashboardApi } from "@/lib/dashboardApi";
import { KpiGrid, LoadingCard, OfflineCard, useAsync } from "./parts";

export default function ReportsAdmin() {
  const { data, loading, refresh } = useAsync(() => dashboardApi.reports());
  if (loading) return <LoadingCard />;
  if (!data) return <OfflineCard onRetry={refresh} />;

  const today = data.byPeriod?.today;

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>Báo cáo &amp; phân tích</h1>
          <p>Hiệu quả trợ lý theo mục tiêu nghiệm thu (containment, CSAT, WER…).</p>
        </div>
        <button className="control" onClick={refresh}>↻ Làm mới</button>
      </div>

      {today?.kpis && <KpiGrid kpis={today.kpis} />}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Chỉ tiêu vs Mục tiêu</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Chỉ số</th><th>Mục tiêu</th><th>Thực tế</th><th>Đạt</th></tr></thead>
            <tbody>
              {(data.targetKpis ?? []).map((t) => (
                <tr key={t.metric} style={{ cursor: "default" }}>
                  <td>{t.metric}</td>
                  <td><small>{t.target}</small></td>
                  <td><b>{t.actual}</b></td>
                  <td><span className={`badge ${t.ok ? "green" : "red"}`}>{t.ok ? "✓ Đạt" : "✗ Chưa đạt"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Nhận định</h2></div>
        <div className="insight-list">
          {(data.insights ?? []).map((ins, i) => (
            <div className="insight" key={i}>
              <div className="insight-icon">{ins.icon}</div>
              <div>
                <b>{ins.title}</b>
                <p>{ins.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
