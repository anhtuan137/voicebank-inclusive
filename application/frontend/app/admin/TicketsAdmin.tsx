"use client";
// Tab "Ticket hỗ trợ" (/admin) — danh sách + lọc + chi tiết AI summary + tiếp nhận/hoàn tất.
import { useMemo, useState } from "react";
import { dashboardApi, type Ticket } from "@/lib/dashboardApi";
import { LoadingCard, OfflineCard, useAsync } from "./parts";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "Mới", cls: "blue" },
  processing: { label: "Đang xử lý", cls: "orange" },
  waiting: { label: "Chờ phản hồi", cls: "purple" },
  closed: { label: "Đã đóng", cls: "gray" },
};

export default function TicketsAdmin({ toast }: { toast: (msg: string) => void }) {
  const { data, loading, refresh } = useAsync(() => dashboardApi.tickets());
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Đồng bộ state nội bộ khi data tải xong (để cập nhật trạng thái cục bộ nếu backend json).
  const list = tickets ?? data?.tickets ?? [];
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: list.length };
    for (const t of list) m[t.status] = (m[t.status] || 0) + 1;
    return m;
  }, [list]);

  if (loading && !data) return <LoadingCard />;
  if (!data) return <OfflineCard onRetry={refresh} />;

  const filtered = filter === "all" ? list : list.filter((t) => t.status === filter);
  const active = list.find((t) => t.id === activeId) ?? null;

  function setStatus(id: string, status: string) {
    setTickets((prev) => (prev ?? data?.tickets ?? []).map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function move(t: Ticket, status: string, label: string) {
    setStatus(t.id, status);                          // cập nhật lạc quan
    const ok = await dashboardApi.updateTicket(t.id, status);
    toast(ok ? `✓ ${label} ${t.id}` : `✓ ${label} ${t.id} (cục bộ — bật Postgres để lưu)`);
  }

  return (
    <>
      <div className="topbar">
        <div className="title">
          <h1>Ticket hỗ trợ</h1>
          <p>Tiếp nhận &amp; xử lý yêu cầu từ trợ lý chuyển sang nhân viên.</p>
        </div>
        <button className="control" onClick={refresh}>↻ Làm mới</button>
      </div>

      <div className="filter-row" style={{ marginTop: 0 }}>
        {[{ key: "all", label: "Tất cả" }, { key: "new", label: "Mới" }, { key: "processing", label: "Đang xử lý" }, { key: "waiting", label: "Chờ phản hồi" }, { key: "closed", label: "Đã đóng" }].map((f) => (
          <button key={f.key} className={`chip ${f.key === filter ? "active" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label} <b>{counts[f.key] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="family-layout">
        <div className="card">
          <div className="card-head"><h2>Danh sách ({filtered.length})</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mã / Chủ đề</th><th>Khách hàng</th><th>Ưu tiên</th><th>SLA</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td className="empty" colSpan={5}>Không có ticket phù hợp.</td></tr>
                ) : filtered.map((t) => {
                  const st = STATUS_META[t.status] ?? { label: t.status, cls: "gray" };
                  return (
                    <tr key={t.id} className={t.id === activeId ? "selected" : ""} onClick={() => setActiveId(t.id)}>
                      <td>{t.subject}<br /><small>{t.id} · {t.createdAt}</small></td>
                      <td>{t.customer}<br /><small>{t.phone}</small></td>
                      <td><span className={`badge ${t.priorityCls}`}>{t.priority}</span></td>
                      <td>{t.sla}{t.slaNote ? <><br /><small>{t.slaNote}</small></> : null}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          {!active ? (
            <div className="empty">Chọn một ticket để xem chi tiết.</div>
          ) : (
            <>
              <div className="card-head">
                <div>
                  <h2>{active.id} <span className={`badge ${(STATUS_META[active.status] ?? { cls: "gray" }).cls}`}>{(STATUS_META[active.status] ?? { label: active.status }).label}</span></h2>
                  <h3 style={{ margin: "6px 0 0", fontSize: 15 }}>{active.subject}</h3>
                </div>
              </div>
              <div className="info-grid">
                <div className="info-row"><span>Khách hàng</span><b>{active.customer}</b></div>
                <div className="info-row"><span>Liên hệ</span><b>{active.phone}</b></div>
                <div className="info-row"><span>Kênh</span><b>{active.channel}</b></div>
                <div className="info-row"><span>Phụ trách</span><b>{active.assignee || "Chưa gán"}</b></div>
              </div>
              {active.aiSummary && (
                <div className="small-panel" style={{ marginTop: 12 }}>
                  <b>🤖 Tóm tắt AI {active.aiConf ? `(${active.aiConf}%)` : ""}</b>
                  <p>{active.aiSummary}</p>
                </div>
              )}
              <div className="actions">
                {active.status === "new" && <button className="btn primary" onClick={() => move(active, "processing", "Đã tiếp nhận")}>📥 Tiếp nhận</button>}
                {active.status !== "closed" && <button className="btn" onClick={() => move(active, "closed", "Đã hoàn tất")}>✓ Hoàn tất</button>}
                {active.status === "closed" && <button className="btn" onClick={() => move(active, "processing", "Đã mở lại")}>↩ Mở lại</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
