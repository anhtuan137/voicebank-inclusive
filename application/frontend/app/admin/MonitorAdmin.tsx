"use client";
// Tab "Giám sát hội thoại" (/admin) — phiên hội thoại real-time + transcript + hàng đợi escalation.
import { useState } from "react";
import { dashboardApi } from "@/lib/dashboardApi";
import { KpiGrid, LoadingCard, OfflineCard, useAsync } from "./parts";

const RISK: Record<string, string> = { low: "green", medium: "orange", high: "red" };

export default function MonitorAdmin() {
  const { data, loading, refresh } = useAsync(() => dashboardApi.monitor());
  const [openId, setOpenId] = useState<string | null>(null);
  if (loading) return <LoadingCard />;
  if (!data) return <OfflineCard onRetry={refresh} />;

  const open = data.conversations.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>Giám sát hội thoại</h1>
          <p>Theo dõi phiên trợ lý đang diễn ra &amp; tiếp nhận khi cần can thiệp.</p>
        </div>
        <button className="control" onClick={refresh}>↻ Làm mới</button>
      </div>

      <KpiGrid kpis={data.monitorKpis} />

      <div className="family-layout">
        <div className="card">
          <div className="card-head"><h2>Phiên hội thoại ({data.conversations.length})</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Khách hàng</th><th>Ý định</th><th>Cảm xúc</th><th>Rủi ro</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {data.conversations.map((c) => (
                  <tr key={c.id} className={c.id === openId ? "selected" : ""} onClick={() => setOpenId(c.id)}>
                    <td>{c.customer}<br /><small>{c.time} · {c.duration}</small></td>
                    <td>{c.intent}<br /><small>{c.intentConf}% tin cậy</small></td>
                    <td>{c.mood}<br /><small>{c.moodScore}</small></td>
                    <td><span className={`badge ${RISK[c.risk] ?? "gray"}`}>{c.risk}</span></td>
                    <td><span className={`badge ${c.status === "escalated" ? "red" : "blue"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>Transcript</h2></div>
          {!open ? (
            <div className="empty">Chọn một phiên để xem nội dung.</div>
          ) : (
            <>
              <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
                {open.customer} · {open.phone} · {open.channel}
              </div>
              <div className="transcript">
                {(open.transcript ?? []).map((m, i) => (
                  <div key={i} className={`bubble ${m.who === "bot" || m.who === "an" ? "bot" : "user"}`}>
                    <small>{m.name} · {m.time}</small>
                    <div>{m.text}</div>
                  </div>
                ))}
                {(open.transcript ?? []).length === 0 && <div className="empty">Chưa có transcript.</div>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Hàng đợi chuyển tổng đài ({data.escalations.length})</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mã</th><th>Khách hàng</th><th>Lý do</th><th>Ưu tiên</th><th>Trạng thái</th><th>Chờ</th></tr></thead>
            <tbody>
              {data.escalations.map((e) => (
                <tr key={e.code} style={{ cursor: "default" }}>
                  <td>{e.code}</td>
                  <td>{e.customer}</td>
                  <td>{e.reason}</td>
                  <td><span className={`badge ${e.priorityCls}`}>{e.priority}</span></td>
                  <td><span className={`badge ${e.statusCls}`}>{e.status}</span></td>
                  <td>{e.wait}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
