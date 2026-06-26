"use client";
// Mảnh dùng chung cho Admin Console & Quản lý vận hành — Phase 6.
import { useEffect, useState } from "react";
import type { Kpi } from "@/lib/dashboardApi";

/** Hook tải dữ liệu bất đồng bộ 1 lần + nút làm mới. */
export function useAsync<T>(fn: () => Promise<T | null>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then((d) => { if (alive) { setData(d); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return { data, loading, refresh: () => setTick((t) => t + 1) };
}

/** Dải KPI 4 cột. */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid4">
      {kpis.map((k) => (
        <div className="card kpi" key={k.label}>
          <div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            {k.delta && (
              <div className={`delta ${k.dir ?? "up"}`}>
                <b>{k.delta}</b> {k.sub}
              </div>
            )}
          </div>
          {k.icon && <div className={`kpi-icon ${k.iconCls ?? ""}`}>{k.icon}</div>}
        </div>
      ))}
    </div>
  );
}

/** Trạng thái mất kết nối backend. */
export function OfflineCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="placeholder">
      <div className="big">🔌</div>
      <h2 style={{ margin: 0 }}>Chưa kết nối được Mock Bank Core</h2>
      <p style={{ maxWidth: 440 }}>
        Hãy chạy <code>make run-mockapi</code> (cổng :18890) rồi thử lại.
      </p>
      <button className="btn primary" onClick={onRetry}>↻ Thử lại</button>
    </div>
  );
}

/** Khung loading đơn giản. */
export function LoadingCard() {
  return (
    <div className="placeholder">
      <div className="big">⏳</div>
      <p>Đang tải dữ liệu…</p>
    </div>
  );
}
