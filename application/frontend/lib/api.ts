// Cầu nối tới Mock Bank Core (mockapi, :18890) — Phase 6 integration.
//   • recordUserAction: đồng bộ thao tác Trợ lý An vào dashboard (conversations/tickets).
//   • bankApi: client gõ kiểu cho các route nghiệp vụ §9.3 (auth/card/transfer/savings…).
// Triết lý demo: mọi lời gọi có thể NÉM lỗi để caller tự fallback về mock; backend
// offline / DB json → UI vẫn chạy. Khách hàng demo khớp seed db/database.json.
import { user } from "./mock";

const MOCKAPI =
  process.env.NEXT_PUBLIC_MOCKAPI_URL || "http://localhost:18890";

/** Số điện thoại khách hàng demo — khớp seed db/database.json (Đỗ Anh Tuấn). */
export const DEMO_PHONE = "0790123456";

export interface UserAction {
  op: string;                          // "Chuyển tiền" | "Khoá thẻ" | …
  kind?: "transaction" | "support" | "fraud";
  amount?: number | null;              // VND (int)
  status?: string;
  detail?: string;
  code?: string | null;
  userSaid?: string;                   // câu người dùng nói (cho transcript admin)
}

/** Ghi thao tác khách hàng về mockapi → vào conversations/tickets (không chặn UI). */
export async function recordUserAction(a: UserAction): Promise<void> {
  try {
    await fetch(`${MOCKAPI}/api/v1/dashboard/user-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: a.op,
        kind: a.kind ?? "transaction",
        customer: user.name,
        amount: a.amount ?? null,
        status: a.status ?? "Thành công",
        detail: a.detail ?? "",
        code: a.code ?? null,
        user_said: a.userSaid,
      }),
    });
  } catch {
    // backend chưa chạy → bỏ qua, demo vẫn tiếp tục
  }
}

// ── Typed client cho lõi nghiệp vụ ────────────────────────────────────────────
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MOCKAPI}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail: unknown;
    try { detail = (await res.json()).detail; } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "object" && detail && "message" in detail
      ? String((detail as { message: unknown }).message)
      : `HTTP ${status}`);
  }
}

const post = <T>(path: string, body: unknown) =>
  req<T>(path, { method: "POST", body: JSON.stringify(body) });

export interface Profile {
  name: string;
  account_number: string;
  account_balance: number;
  vcb_pay_balance: number;
  card_last4: string;
  card_status: "active" | "locked" | "temp_locked";
  phone_last4: string;
}
export interface BankTxn {
  id: string;
  date: string;            // "YYYY-MM-DD"
  amount: number;          // int VND, âm = chi ra
  desc: string;
  transaction_type: string;
  category: string;
}
export interface TransferVerifyResult { status: "ready" | "pending_kyc"; requires_face_kyc: boolean; challenge_id: string | null; }
export interface TransferExecuteResult { status: "executed"; transaction_id: string; amount: number; recipient: string; balance: number; }
export interface InterestResult { principal: number; term_months: number; rate: number; interest: number; maturity_amount: number; }

export const bankApi = {
  getProfile: (phone = DEMO_PHONE) => req<Profile>(`/customers/${phone}`),
  getTransactions: (phone = DEMO_PHONE) =>
    req<{ transactions: BankTxn[] }>(`/transactions?phone=${phone}`).then((r) => r.transactions),

  // Auth (§7.1)
  verifyPin: (pin: string, phone = DEMO_PHONE) =>
    post<{ verified: boolean; locked?: boolean; attempts_left?: number; escalate_to_agent?: boolean }>("/auth/verify-pin", { phone, pin }),
  sendOtp: (phone = DEMO_PHONE) => post<{ sent: boolean; ttl_seconds: number }>("/auth/send-otp", { phone }),
  verifyOtp: (otp: string, phone = DEMO_PHONE) =>
    post<{ verified: boolean; locked?: boolean }>("/auth/verify-otp", { phone, otp }),

  // KYC (§7.4 — 2 bước normal + liveness)
  kycVerify: (challengeId: string | null, phone = DEMO_PHONE) =>
    post<{ verified: boolean }>("/kyc/biometric/verify", { phone, steps: ["normal", "liveness"], challenge_id: challengeId }),

  // Transfer (§7.2)
  transferVerify: (b: { amount: number; recipient_account: string; bank_code?: string; note?: string; phone?: string }) =>
    post<TransferVerifyResult>("/transfer/verify", { phone: DEMO_PHONE, bank_code: "VCB", note: "", ...b }),
  transferExecute: (b: { amount: number; recipient_account: string; bank_code?: string; note?: string; recipient_name?: string; challenge_id?: string | null; idempotency_key?: string; phone?: string }) =>
    post<TransferExecuteResult>("/transfer/execute", { phone: DEMO_PHONE, bank_code: "VCB", note: "", ...b }),

  // Savings (§7.3)
  savingsCalculate: (principal: number, termMonths: number) =>
    req<InterestResult>(`/savings/calculate-interest?principal=${principal}&term_months=${termMonths}`),
  savingsOpen: (b: { amount: number; term_months: number; type?: string; auto_deposit?: number | null; phone?: string }) =>
    post<{ savings: { id: string; status: string; rate: number }; interest: number; maturity_amount: number; balance: number }>("/savings/open", { phone: DEMO_PHONE, type: "flexible", ...b }),

  // Card / service
  cardLock: (phone = DEMO_PHONE) => post<{ card_status: string }>("/card/lock", { phone }),
  cardUnlock: (phone = DEMO_PHONE) => post<{ card_status: string }>("/card/unlock", { phone }),
};
