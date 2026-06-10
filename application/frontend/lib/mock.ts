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

export const favorites = [
  { icon: "store", label: "Digishop" },
  { icon: "transfer", label: "Chuyển tiền trong nước" },
  { icon: "sim", label: "Nạp Data 4G/5G" },
  { icon: "piggy", label: "Mở tiết kiệm" },
  { icon: "phone", label: "Nạp tiền điện thoại" },
  { icon: "ticket", label: "Đặt vé xem phim" },
] as const;
