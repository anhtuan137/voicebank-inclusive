// Lưu & tổng hợp đánh giá CSAT (1–5 sao) sau mỗi phiên với Trợ lý An (§14 CSAT).
//
// Frontend hiện chạy trên mock-data nên đánh giá được lưu cục bộ ở localStorage để
// demo tích luỹ qua nhiều phiên. Khi backend sẵn sàng, thay `saveRating` bằng
// POST /api/v1/feedback (voice2text/mockapi) — phần UI không phải đổi.

export interface SessionRating {
  id: string;
  rating: number; // 1..5
  tags: string[]; // lý do nhanh đã chọn
  note: string; // góp ý tự do (tuỳ chọn)
  context: string; // "Trợ lý An", "Thanh toán hoá đơn"…
  at: string; // ISO timestamp
}

const KEY = "vb_session_ratings";

export function loadRatings(): SessionRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionRating[]) : [];
  } catch {
    return [];
  }
}

export function saveRating(
  entry: Omit<SessionRating, "id" | "at">,
): SessionRating {
  const full: SessionRating = {
    ...entry,
    id: `R-${Date.now()}`,
    at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      const all = loadRatings();
      all.unshift(full);
      window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
    } catch {
      /* localStorage không khả dụng — bỏ qua, vẫn trả về entry */
    }
  }
  return full;
}

/** CSAT trung bình (1 chữ số thập phân) + tổng số lượt. */
export function csatSummary(): { avg: number; count: number } {
  const all = loadRatings();
  if (all.length === 0) return { avg: 0, count: 0 };
  const sum = all.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / all.length) * 10) / 10, count: all.length };
}
