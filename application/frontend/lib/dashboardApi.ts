// Client cho VCB Admin Console (/admin) & Quản lý vận hành (/user-management) — Phase 6.
// Đọc dữ liệu từ mockapi /api/v1/dashboard/* (snapshot JSON, hoạt động cả khi chưa có
// Postgres). Mọi hàm trả null nếu backend offline → UI hiện trạng thái "mất kết nối".
const MOCKAPI = process.env.NEXT_PUBLIC_MOCKAPI_URL || "http://localhost:18890";
const BASE = `${MOCKAPI}/api/v1/dashboard`;

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  sub?: string;
  dir?: "up" | "down";
  icon?: string;
  iconCls?: string;
}

interface Period<T> { [period: string]: T }

export interface OverviewData {
  byPeriod: Period<{
    kpis: Kpi[];
    traffic?: { labels: string[]; values: number[]; max: number };
    requestMix?: { label: string; pct: number; color?: string }[];
  }>;
  escalationReasons?: { label: string; value: number; pct: number }[];
  alerts?: { time: string; level: string; levelClass: string; type: string; content: string; status: string; statusClass: string }[];
  liveKpis?: Kpi[];
}

export interface ReportsData {
  byPeriod: Period<{ kpis: Kpi[] }>;
  insights?: { icon: string; title: string; text: string }[];
  targetKpis?: { metric: string; target: string; actual: string; ok: boolean }[];
}

export interface Conversation {
  id: string; time: string; duration: string; customer: string; phone: string;
  channel: string; status: string; risk: string; intent: string; intentConf: number;
  mood: string; moodScore: string; moodPct: number;
  transcript?: { who: string; name: string; time: string; text: string; mood?: string; moodCls?: string }[];
}
export interface Escalation {
  code: string; customer: string; reason: string; priority: string; priorityCls: string;
  status: string; statusCls: string; wait: string;
}
export interface MonitorData {
  monitorKpis: Kpi[];
  conversations: Conversation[];
  escalations: Escalation[];
}

export interface Ticket {
  id: string; subject: string; status: string; customer: string; phone: string;
  channel: string; priority: string; priorityCls: string; sla: string; slaNote?: string;
  slaCls?: string; assignee: string; createdAt: string; aiSummary?: string; aiConf?: number;
}
export interface TicketsData {
  ticketFilters: { key: string; label: string; count: number }[];
  tickets: Ticket[];
}

export interface SettingsData {
  security: { name: string; desc: string; on: boolean }[];
  roles: { name: string; desc: string; state: string; cls: string; on: boolean }[];
}

export interface FamilyAlert {
  time: string; dependent: string; type: string; level: string; levelClass: string;
  channels: string; latency: string; read: string; readClass?: string;
}
export interface FamilyData {
  kpis: Kpi[];
  alerts: FamilyAlert[];
}

async function get<T>(section: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${section}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const dashboardApi = {
  overview: () => get<OverviewData>("overview"),
  reports: () => get<ReportsData>("reports"),
  monitor: () => get<MonitorData>("monitor"),
  tickets: () => get<TicketsData>("tickets"),
  settings: () => get<SettingsData>("settings"),
  family: () => get<FamilyData>("family"),

  // Cập nhật trạng thái ticket (tiếp nhận/hoàn tất). Cần DB_SOURCE=postgres ở backend;
  // chế độ json trả 503 → ném lỗi để caller fallback cập nhật cục bộ.
  updateTicket: async (id: string, status: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Bật/tắt cấu hình bảo mật. Cần Postgres; json → 503.
  toggleSecurity: async (name: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/settings/security/${encodeURIComponent(name)}?enabled=${enabled}`, {
        method: "PATCH",
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
