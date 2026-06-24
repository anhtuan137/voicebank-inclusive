// Kiểu dữ liệu cho phân hệ Quản trị (/admin) — Phase 6.
// Tách riêng để tái dùng khi port thêm các tab khác từ legacy-dashboard.

export type BadgeClass = "green" | "orange" | "red" | "blue" | "gray" | "purple";

export type FamilyStatus = "active" | "pending" | "revoked";

export interface FamilyLink {
  id: string;
  guardian: string;
  guardianPhone: string;
  guardianRel: string;
  dependent: string;
  dependentPhone: string;
  dependentRel: string;
  status: FamilyStatus;
  voiceOk: boolean; // BR-FAM-01: cha mẹ đồng ý bằng giọng nói
  ekycOk: boolean; // BR-FAM-01: cha mẹ đồng ý bằng eKYC (liveness + match)
  showBalance: boolean; // BR-FAM-05: mặc định false, chỉ bật khi cha mẹ opt-in
  createdAt: string;
  grantedAt: string | null; // BR-FAM-09: thời điểm CONSENT được cấp
  consentId: string | null;
  dependentGuardians: number; // BR-FAM-06: số guardian hiện tại của dependent (trần 4)
  alerts7d: number;
  revokedAt?: string; // BR-FAM-04
}

export interface FamilyAlert {
  time: string;
  dependent: string;
  type: string;
  level: string;
  levelClass: BadgeClass;
  channels: string; // BR-FAM-07: đẩy đồng thời cho cha mẹ + (các) người trẻ
  latency: string;
  read: string;
  readClass: BadgeClass;
}

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  sub: string;
  dir: "up" | "down";
  icon: string;
  iconCls?: "danger" | "warning";
}

export interface FamilyFilter {
  key: "all" | FamilyStatus;
  label: string;
}
