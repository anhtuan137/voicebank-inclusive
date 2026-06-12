// Demo data for the UI layer (Phase 6). All money is integer VND.
// Replaces real ui_card payloads (§9) until the orchestrator is wired.
import type { Txn, Bill, CategorySpend } from "./types";

export const vnd = (n: number) =>
  `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("vi-VN")}đ`;

export const user = {
  name: "Đỗ Anh Tuấn",
  nameUpper: "ĐỖ ANH TUẤN",
  shortName: "Anh Tuấn",
  initials: "AT",
  tier: "Hạng Tiêu chuẩn",
  account: "1036350085",
  balance: 14_650_000,
};

export const transactions: Txn[] = [
  {
    id: "t1",
    merchant: "Siêu thị WinMart",
    category: "Ăn uống",
    date: "25/05/2025 · 19:24",
    amount: -420_000,
    icon: "Win",
    color: "#e11d48",
  },
  {
    id: "t2",
    merchant: "Grab",
    category: "Đi chuyển",
    date: "24/05/2025 · 18:20",
    amount: -86_000,
    icon: "Grab",
    color: "#0f9d58",
  },
  {
    id: "t3",
    merchant: "Lương tháng 5",
    category: "Thu nhập",
    date: "24/05/2025 · 09:00",
    amount: 12_000_000,
    icon: "₫",
    color: "#16955a",
  },
  {
    id: "t4",
    merchant: "Điện lực EVN",
    category: "Hóa đơn",
    date: "23/05/2025 · 11:30",
    amount: -1_250_000,
    icon: "EVN",
    color: "#2f80ed",
  },
  {
    id: "t5",
    merchant: "Mua sắm Shopee",
    category: "Mua sắm",
    date: "23/05/2025 · 15:10",
    amount: -560_000,
    icon: "S",
    color: "#f97316",
  },
];

export const spendThisMonth = 6_850_000;
export const incomeThisMonth = 9_200_000;

export const bills: Bill[] = [
  {
    id: "b1",
    name: "Internet FPT",
    provider: "Đến hạn hôm nay",
    due: "Hôm nay",
    amount: 385_000,
    status: "today",
    icon: "wifi",
    color: "#ff6b35",
  },
  {
    id: "b2",
    name: "Điện EVN",
    provider: "Đến hạn sau 2 ngày",
    due: "18/05/2025",
    amount: 1_250_000,
    status: "soon",
    icon: "bolt",
    color: "#2f80ed",
  },
  {
    id: "b3",
    name: "Nước sinh hoạt",
    provider: "Đến hạn 21/05",
    due: "21/05/2025",
    amount: 230_000,
    status: "upcoming",
    icon: "droplet",
    color: "#14b8a6",
  },
];

export const billsTotal = bills.reduce((s, b) => s + b.amount, 0);

// Cashflow forecast (cashflow_forecast_flow → ui_card{forecast})
export const forecast = {
  endBalance: 2_450_000,
  current: 14_650_000,
  alertLevel: "warn" as const,
  // y-values for the 30-day downward curve (in millions, for the sparkline)
  curve: [14.6, 13.1, 12.0, 10.4, 9.1, 7.6, 6.0, 4.8, 3.5, 2.45],
};

export const spendCategories: CategorySpend[] = [
  { name: "Ăn uống", amount: 5_200_000, pct: 35, color: "#16955a" },
  { name: "Mua sắm", amount: 4_100_000, pct: 28, color: "#2f80ed" },
  { name: "Hóa đơn", amount: 2_150_000, pct: 15, color: "#f59e0b" },
  { name: "Đi lại", amount: 1_800_000, pct: 12, color: "#8b5cf6" },
  { name: "Khác", amount: 1_500_000, pct: 10, color: "#94a3b8" },
];

export const spendTotal = spendCategories.reduce((s, c) => s + c.amount, 0);

// Savings goal (savings_goal_flow → ui_card{goal}) with gamification
export const goal = {
  name: "Quỹ du lịch Đà Nẵng",
  deadline: "30/09/2025",
  current: 8_500_000,
  target: 20_000_000,
  pct: 42,
  streak: 5,
  badge: "Kỷ luật tốt",
  autoDeposit: 500_000,
};

// Savings product (savings_flow → ui_card{savings})
export const savingsOffer = {
  principal: 10_000_000,
  termMonths: 6,
  rate: 4.8,
  interest: 245_000,
  maturityAmount: 10_245_000,
  source: "1036350085",
  terms: [
    { months: 3, rate: 4.2 },
    { months: 6, rate: 4.8, best: true },
    { months: 12, rate: 5.2 },
  ],
};

// Money transfer confirmation (money_transfer flow → action_required PIN)
export const transferDraft = {
  beneficiary: "Nguyễn Minh Anh",
  bank: "Vietcombank – NH TMCP Ngoại thương Việt Nam",
  account: "2.000.000160",
  amount: 2_000_000,
  note: "Thanh toán tiền ăn tối",
  fraudFlag: true,
};

// Fraud alert (fraud_alert_flow → ui_card)
export const fraudAlert = {
  merchant: "Thanh toán online",
  amount: 4_800_000,
  time: "14:18 hôm nay",
  place: "TP. Hồ Chí Minh",
  device: "Thiết bị chưa từng dùng",
  risks: ["Thiết bị mới", "Giá trị lớn", "Bất thường"],
};

// Support / escalation summary (transfer flow → tổng đài viên, §14)
export const supportTicket = {
  code: "VB-240514-028",
  issue: "Báo ATM nuốt thẻ 6 yêu cầu gọi lại",
  amount: "Trung bình",
  wait: "8 phút",
  status: "Đang chờ",
  summary: [
    { time: "14:13", who: "Bạn", text: "Tôi bị ATM nuốt thẻ ở NH Vietcombank." },
    { time: "14:11", who: "An", text: "Tôi đã kiểm tra và ghi nhận thông tin của bạn." },
    { time: "14:08", who: "Bạn", text: "Tôi muốn được gọi lại để hỗ trợ tiếp." },
  ],
};

// Hằng số nghiệp vụ xác thực (khớp §7 & §16) — dùng cho luồng thanh toán/chuyển tiền
export const KYC_THRESHOLD = 10_000_000; // >10tr/giao dịch → bắt buộc eKYC (BR-TRF-07)
export const MAX_AUTH_ATTEMPTS = 5; // sai >5 lần → khóa (BR-AUTH-03/04/08)
export const LOCK_MINUTES = 15; // thời gian khóa (BR-AUTH-05)
export const OTP_TTL_SECONDS = 300; // OTP hết hạn sau 5 phút (BR-AUTH-02)

// Thanh toán hóa đơn / dịch vụ bằng giọng nói (bill_payment_flow → action_required)
// Số tiền là int VND. Hóa đơn >10tr sẽ kích hoạt thêm bước eKYC khuôn mặt.
export type Biller = {
  id: string;
  category: string;
  provider: string;
  icon:
    | "ticket" | "bolt" | "droplet" | "wifi" | "phone" | "doc" | "store";
  color: string;
  amount: number;
  detail: string;
  code: string; // mã hóa đơn / mã khách hàng (không phải PII nhạy cảm)
};

export const billers: Biller[] = [
  { id: "mv", category: "Vé xem phim", provider: "CGV Vincom Center", icon: "ticket", color: "#e11d48", amount: 240_000, detail: "2 vé · Suất 18:30 · Phòng 4", code: "CGV-250526-0042" },
  { id: "ev", category: "Điện", provider: "EVN HCMC", icon: "bolt", color: "#2f80ed", amount: 1_250_000, detail: "Kỳ 05/2025 · 412 kWh", code: "PE0400123456" },
  { id: "wt", category: "Nước", provider: "Sawaco", icon: "droplet", color: "#14b8a6", amount: 230_000, detail: "Kỳ 05/2025 · 18 m³", code: "DN0700456789" },
  { id: "in", category: "Internet", provider: "FPT Telecom", icon: "wifi", color: "#ff6b35", amount: 385_000, detail: "Gói Super 150 · Tháng 06", code: "FPT-HCM-778899" },
  { id: "ph", category: "Nạp điện thoại", provider: "Viettel", icon: "phone", color: "#16955a", amount: 100_000, detail: "Số ••••3079 · Trả trước", code: "TOPUP-3079" },
  { id: "tu", category: "Học phí", provider: "ĐH Bách Khoa", icon: "doc", color: "#8b5cf6", amount: 12_000_000, detail: "Học kỳ I · 2025-2026", code: "HP-BK-1052678" },
];

// An tâm Gia đình (family_link_flow → ui_card{family}) — §3.5 / §4.6c
// "Nguyên tắc một trục": người trẻ chỉ NHẬN cảnh báo & kết quả, không bao giờ
// thao tác được tiền của người thân. Người thân đồng ý bằng giọng nói + eKYC và
// có thể thu hồi liên kết bất kỳ lúc nào (NĐ 13/2023).
export type FamilyStatus = "active" | "pending" | "revoked";

export const familyMembers: {
  id: string;
  relation: string;
  name: string;
  phone4: string; // chỉ lưu 4 số cuối (BR-SEC-02)
  status: FamilyStatus;
  consent: string | null; // mã/ngày đồng ý NĐ 13/2023
  alerts: boolean;
}[] = [
  { id: "f1", relation: "Mẹ", name: "Trần Thị Hoa", phone4: "4567", status: "active", consent: "Đồng ý 02/2026", alerts: true },
  { id: "f2", relation: "Bố", name: "Đỗ Văn Minh", phone4: "8901", status: "pending", consent: null, alerts: true },
];

export const familyAlerts: {
  id: string;
  kind: "result" | "fraud" | "summary";
  who: string;
  time: string;
  text: string;
}[] = [
  {
    id: "fa1",
    kind: "result",
    who: "Mẹ",
    time: "10 phút trước",
    text: "Mẹ vừa tự khóa thẻ thành công bằng giọng nói – tài khoản an toàn.",
  },
  {
    id: "fa2",
    kind: "fraud",
    who: "Bố",
    time: "1 giờ trước",
    text: "Giao dịch bất thường 8.500.000đ trên tài khoản của bố – khớp xu hướng lừa đảo (vnSocial). Đã cảnh báo đồng thời cho cả hai.",
  },
  {
    id: "fa3",
    kind: "summary",
    who: "Mẹ",
    time: "Hôm nay",
    text: "Mẹ đã chi 3.200.000đ tháng này, chủ yếu cho hóa đơn & thuốc men.",
  },
];

export const favorites = [
  { icon: "users", label: "An tâm Gia đình" },
  { icon: "transfer", label: "Chuyển tiền trong nước" },
  { icon: "sim", label: "Nạp Data 4G/5G" },
  { icon: "piggy", label: "Mở tiết kiệm" },
  { icon: "phone", label: "Nạp tiền điện thoại" },
  { icon: "ticket", label: "Đặt vé xem phim" },
] as const;
