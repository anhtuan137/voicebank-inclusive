// Dữ liệu mô phỏng cho tab "An tâm Gia đình" (/admin) — Phase 6.
// Port từ legacy-dashboard/data/family.json. Sẽ thay bằng GET /analytics/summary
// + REST liên kết gia đình khi backend Phase 1/4 sẵn sàng.
import type { FamilyAlert, FamilyFilter, FamilyLink, Kpi } from "./types";

export const FAMILY_MAX_GUARDIANS = 4; // BR-FAM-06

export const familyKpis: Kpi[] = [
  { label: "Liên kết đang hoạt động", value: "1.248", delta: "↑ 14,2%", sub: "so với tuần trước", dir: "up", icon: "🔗" },
  { label: "Cha mẹ tự hoàn tất giao dịch", value: "92,3%", delta: "↑ 3,1%", sub: "không cần người trẻ thao tác", dir: "up", icon: "✅" },
  { label: "Cảnh báo gia đình (gửi / đọc)", value: "356 / 311", delta: "↑ 87,4%", sub: "tỷ lệ guardian đã đọc", dir: "up", icon: "🔔" },
  { label: "Phát hiện → guardian nhận", value: "8,2s", delta: "↓ 1,4s", sub: "độ trễ trung bình", dir: "down", icon: "⚡", iconCls: "warning" },
];

export const familyFilters: FamilyFilter[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "pending", label: "Chờ cha mẹ đồng ý" },
  { key: "revoked", label: "Đã thu hồi" },
];

export const familyLinks: FamilyLink[] = [
  {
    id: "FL-2025-0148",
    guardian: "Nguyễn Minh Anh", guardianPhone: "0901 234 567", guardianRel: "Con gái",
    dependent: "Nguyễn Văn Bình", dependentPhone: "0987 654 321", dependentRel: "Bố (62 tuổi)",
    status: "active", voiceOk: true, ekycOk: true, showBalance: false,
    createdAt: "12/05/2025 09:14", grantedAt: "12/05/2025 09:21",
    consentId: "CST-2025-8841", dependentGuardians: 2, alerts7d: 3,
  },
  {
    id: "FL-2025-0152",
    guardian: "Trần Quốc Huy", guardianPhone: "0935 111 222", guardianRel: "Con trai",
    dependent: "Trần Thị Lan", dependentPhone: "0908 333 444", dependentRel: "Mẹ (58 tuổi)",
    status: "active", voiceOk: true, ekycOk: true, showBalance: true,
    createdAt: "18/05/2025 16:02", grantedAt: "18/05/2025 16:10",
    consentId: "CST-2025-9023", dependentGuardians: 1, alerts7d: 0,
  },
  {
    id: "FL-2025-0160",
    guardian: "Lê Thuỳ Dung", guardianPhone: "0977 555 666", guardianRel: "Con gái",
    dependent: "Lê Văn Tấn", dependentPhone: "0913 777 888", dependentRel: "Bố (65 tuổi)",
    status: "active", voiceOk: true, ekycOk: true, showBalance: false,
    createdAt: "22/05/2025 10:48", grantedAt: "22/05/2025 10:55",
    consentId: "CST-2025-9117", dependentGuardians: 4, alerts7d: 1,
  },
  {
    id: "FL-2025-0171",
    guardian: "Phạm Gia Bảo", guardianPhone: "0902 999 000", guardianRel: "Con trai",
    dependent: "Phạm Thị Hồng", dependentPhone: "0986 121 314", dependentRel: "Mẹ (60 tuổi)",
    status: "pending", voiceOk: false, ekycOk: false, showBalance: false,
    createdAt: "01/06/2025 08:30", grantedAt: null,
    consentId: null, dependentGuardians: 0, alerts7d: 0,
  },
  {
    id: "FL-2025-0173",
    guardian: "Đỗ Hải Yến", guardianPhone: "0934 246 802", guardianRel: "Con gái",
    dependent: "Đỗ Văn Cường", dependentPhone: "0905 864 213", dependentRel: "Bố (67 tuổi)",
    status: "pending", voiceOk: true, ekycOk: false, showBalance: false,
    createdAt: "01/06/2025 09:05", grantedAt: null,
    consentId: null, dependentGuardians: 0, alerts7d: 0,
  },
  {
    id: "FL-2025-0119",
    guardian: "Vũ Khánh Linh", guardianPhone: "0966 357 159", guardianRel: "Con gái",
    dependent: "Vũ Đình Phúc", dependentPhone: "0911 753 951", dependentRel: "Bố (70 tuổi)",
    status: "revoked", voiceOk: true, ekycOk: true, showBalance: false,
    createdAt: "02/05/2025 14:20", grantedAt: "02/05/2025 14:28",
    consentId: "CST-2025-7042", dependentGuardians: 0, alerts7d: 0,
    revokedAt: "28/05/2025 19:40",
  },
];

export const familyAlerts: FamilyAlert[] = [
  { time: "01/06/2025 09:21", dependent: "Nguyễn Văn Bình", type: "Nghi vấn lừa đảo (chuyển khoản lạ)", level: "Cao", levelClass: "red", channels: "Cha mẹ + 2 người trẻ", latency: "7,4s", read: "Đã đọc", readClass: "green" },
  { time: "31/05/2025 20:11", dependent: "Lê Văn Tấn", type: "Giao dịch giá trị lớn ngoài thói quen", level: "Trung bình", levelClass: "orange", channels: "Cha mẹ + 4 người trẻ", latency: "9,1s", read: "Đã đọc", readClass: "green" },
  { time: "31/05/2025 11:47", dependent: "Nguyễn Văn Bình", type: "Khóa thẻ khẩn cấp (cha mẹ tự thực hiện)", level: "Thấp", levelClass: "blue", channels: "2 người trẻ", latency: "5,8s", read: "Đã đọc", readClass: "green" },
  { time: "30/05/2025 22:03", dependent: "Lê Văn Tấn", type: "Xu hướng lừa đảo vùng (vnSocial)", level: "Trung bình", levelClass: "orange", channels: "Cha mẹ + 4 người trẻ", latency: "10,2s", read: "Chưa đọc", readClass: "orange" },
  { time: "30/05/2025 08:15", dependent: "Nguyễn Văn Bình", type: "Cảnh báo OTP bất thường", level: "Cao", levelClass: "red", channels: "Cha mẹ + 2 người trẻ", latency: "6,9s", read: "Đã đọc", readClass: "green" },
];
