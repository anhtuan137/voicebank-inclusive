"use client";
// Trợ lý An — phiên chat hội thoại: người dùng nhập HOẶC nói, Bot nhận diện ý định
// rồi dẫn dắt thao tác theo từng bước (slot-filling) ngay trong khung chat (§13).
// Luồng giao dịch đã hội thoại hoá: CHUYỂN TIỀN, MỞ TIẾT KIỆM, THANH TOÁN HOÁ ĐƠN.
// Nhóm 1 — Kế thừa (§13) chạy trong chat:
//   • money_transfer / savings / vcb_pay (chuyển tiền, mở tiết kiệm, thanh toán hoá đơn)
//   • transaction    → tra số dư & lịch sử giao dịch
//   • card_lock       → khoá thẻ (xác thực khuôn mặt)
//   • service_lock    → khoá dịch vụ (NH điện tử / thanh toán online / rút ATM)
//   • card_swallowed  → báo ATM nuốt thẻ → tạo phiếu hỗ trợ
//   • callback        → đặt lịch gọi lại
//   • transfer        → chuyển tổng đài viên (gặp người thật)
//   • guidance        → hướng dẫn how-to
// Nhóm 2 — Gen Z / Dự báo (§13) cũng chạy trong chat:
//   • spending_insight_flow  → thẻ chi tiêu theo danh mục
//   • cashflow_forecast_flow → thẻ dự báo dòng tiền + cảnh báo "cháy túi"
//   • savings_goal_flow      → đặt mục tiêu bằng giọng nói + gửi góp tự động + gamification
//   • fraud_alert_flow       → cảnh báo giao dịch bất thường + hành động khoá thẻ
// Mỗi luồng kết thúc → Bot hỏi "còn thao tác nào khác không?"; nói "Không" mới dừng + CSAT.
import { useState, useRef, useEffect } from "react";
import { AppBar } from "../chrome";
import { Robot, Waveform, Sparkline, Donut, Ring } from "../primitives";
import { ActionChips } from "../AssistantBits";
import { FaceKyc } from "../FaceKyc";
import { Icon } from "../Icon";
import {
  billers, savingsOffer, vnd, type Biller,
  forecast, spendCategories, spendTotal, fraudAlert,
  user, transactions,
  familyMembers, familyAlerts, type FamilyStatus,
} from "@/lib/mock";
import { recordUserAction, bankApi, backendServiceName } from "@/lib/api";
import { useLiveData } from "@/lib/LiveData";
import type { Screen } from "@/lib/types";

interface Receipt {
  opName: string; // "Chuyển tiền" | "Mở sổ tiết kiệm" | "Thanh toán hoá đơn"
  amount: number;
  subtitle: string;
  rows: { label: string; value: string }[];
}
// Kế hoạch mục tiêu tiết kiệm (savings_goal_flow).
interface GoalPlan { name: string; target: number; auto: number; months: number; }

// Thao tác bảo mật cần xác thực khuôn mặt (card_lock / service_lock) — xác nhận → quét mặt → xong.
interface SecureOp {
  cta: string;            // nhãn nút xác nhận, vd "Khoá thẻ"
  confirmCap: string;     // câu dẫn trên thẻ xác nhận
  rows: { label: string; value: string }[];
  authCap: string;        // câu dẫn trên thẻ quét mặt
  doneTitle: string;      // vd "Đã khoá thẻ"
  doneSub: string;
  kind?: "card" | "service";  // để biết gọi backend nào khi hoàn tất
  serviceLabel?: string;      // nhãn dịch vụ FE (cho service_lock)
}
// Phiếu hỗ trợ (card_swallowed / callback / transfer→tổng đài).
interface Ticket {
  icon: "card" | "phone" | "headset";
  title: string;
  rows: { label: string; value: string }[];
  note: string;
}
// Đổi/tạo mã PIN thẻ (theo luồng VCB Digibank: Quản lý DV Thẻ → DV Thẻ khác → Tạo mới/Đổi mã PIN).
interface PinInfo { cardType: string; cardNo: string; brand: string; }

// An tâm Gia đình (§7.5/§13) — "nguyên tắc một trục": người trẻ chỉ NHẬN cảnh báo/kết quả,
// KHÔNG có quyền giao dịch trên tài khoản người thân (BR-FAM-02). Liên kết chỉ kích hoạt khi
// người trẻ khởi xướng VÀ người thân đồng ý bằng giọng nói + eKYC (BR-FAM-01).
interface FamilyLink { relation: string; phone4: string; }

// Thẻ trong chat: thẻ giao dịch (Receipt) + Nhóm 1 + Nhóm 2.
type ChatCard =
  | { kind: "confirm" | "auth" | "success"; receipt: Receipt }
  | { kind: "spending" }
  | { kind: "forecast" }
  | { kind: "fraud" }
  | { kind: "fraudAuth" }   // quét mặt trước khi khoá thẻ
  | { kind: "lockDone" }    // đã khoá thẻ thành công
  | { kind: "goalConfirm"; plan: GoalPlan }
  | { kind: "goalDone"; plan: GoalPlan }
  | { kind: "balance" }
  | { kind: "secureConfirm"; op: SecureOp }
  | { kind: "secureAuth"; op: SecureOp }
  | { kind: "secureDone"; op: SecureOp }
  | { kind: "ticket"; ticket: Ticket }
  | { kind: "pinConfirm"; info: PinInfo }
  | { kind: "pinSuccess"; info: PinInfo; txn: string }
  | { kind: "familyOverview" }
  | { kind: "familyLinkConfirm"; link: FamilyLink }
  | { kind: "familyPending"; link: FamilyLink }
  | { kind: "familyActive"; link: FamilyLink }
  | { kind: "familyAlerts" }
  | { kind: "familySummary" };

interface Msg {
  id: number;
  from: "user" | "an";
  text?: string;
  card?: ChatCard;
}
interface Draft {
  recipient?: string; bank?: string; account?: string; amount?: number; note?: string;
  term?: number;
  bill?: { service: string; provider: string; code: string };
  receipt?: Receipt;
  goalName?: string; goalTarget?: number; goalAuto?: number;
  secure?: SecureOp;
  cardType?: string; cardNo?: string; brand?: string; pin?: string; authMethod?: string;
  famRelation?: string; famPhone4?: string;
}

const CARD_LABEL = "Vietcombank Debit ••6789";
// Bước của các luồng (null = chat tự do). "more" = đã xong, Bot hỏi làm gì tiếp.
type Step =
  | "tf_to" | "tf_amt" | "tf_note"
  | "sv_amt" | "sv_term"
  | "bp_pick"
  | "sg_name" | "sg_target" | "sg_auto" | "sg_confirm"
  | "fraud" | "fraud_auth"
  | "sl_pick" | "cb_time" | "cs_loc"
  | "sec_confirm" | "sec_auth"
  | "pin_type" | "pin_new" | "pin_re" | "pin_review" | "pin_otp"
  | "fam_menu" | "fam_relation" | "fam_phone" | "fam_confirm" | "fam_pending"
  | "confirm" | "auth" | "more";

const WELCOME: Msg[] = [
  { id: 0, from: "an", text: "Chào Anh Tuấn! Tôi là An, trợ lý tài chính cá nhân của bạn. Bạn muốn làm gì hôm nay? (gõ hoặc bấm mic để nói)" },
];

type SuggestAct = "transfer" | "spending" | "forecast" | "goal";
const SUGGESTIONS: { label: string; act: SuggestAct }[] = [
  { label: "Chuyển tiền",         act: "transfer" },
  { label: "Chi tiêu tháng này",  act: "spending" },
  { label: "Dự báo cuối tháng",   act: "forecast" },
  { label: "Đặt mục tiêu",        act: "goal" },
];

/** Hiểu số tiền từ lời nói/chữ: "2 triệu", "2tr", "500k", "2.000.000". */
function parseVnd(s: string): number {
  const t = s.toLowerCase().replace(/\./g, "").replace(/,/g, "").trim();
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (/tri[eệ]u|tr\b/.test(t)) n *= 1_000_000;
  else if (/ngh[ìi]n|ngan|k\b/.test(t)) n *= 1_000;
  return Math.round(n);
}

/** Kỳ hạn tiết kiệm: 3 / 6 / 12 tháng (mặc định 6). */
function parseTerm(s: string): number {
  const m = s.match(/(12|6|3)/);
  return m ? parseInt(m[1], 10) : 6;
}

/** Khớp hoá đơn theo từ khoá dịch vụ. */
function findBiller(s: string): Biller | undefined {
  const lq = s.toLowerCase();
  const by = (id: string) => billers.find((b) => b.id === id);
  if (/phim|cgv/.test(lq)) return by("mv");
  if (/n[uư][oớ]c|sawaco/.test(lq)) return by("wt");
  if (/internet|fpt|wifi|m[aạ]ng/.test(lq)) return by("in");
  if (/h[oọ]c ph[íi]|kinh t[eế]|qu[oố]c d[aâ]n|đ[aạ]i h[oọ]c/.test(lq)) return by("tu");
  if (/đi[eệ]n tho[aạ]i|n[aạ]p|viettel|th[eẻ]/.test(lq)) return by("ph");
  if (/đi[eệ]n|evn/.test(lq)) return by("ev");
  return undefined;
}

/** Khớp dịch vụ cần khoá (service_lock). */
function matchService(s: string): string {
  const lq = s.toLowerCase();
  if (/thanh to[aá]n|online|qr/.test(lq)) return "Thanh toán online";
  if (/atm|r[uú]t ti[eề]n/.test(lq)) return "Rút tiền ATM";
  if (/ng[aâ]n h[aà]ng đi[eệ]n t[uử]|internet banking|ebanking|đi[eệ]n t[uử]/.test(lq)) return "Ngân hàng điện tử";
  return "Ngân hàng điện tử";
}

/** Sinh mã phiếu hỗ trợ ngắn (demo). */
function ticketCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Sinh mã giao dịch 10 số (demo) — dùng cho thẻ thành công đổi PIN. */
function txnCode(): string {
  return Math.floor(1_000_000_000 + Math.random() * 9_000_000_000).toString();
}

/** Trả lời hướng dẫn how-to (guidance) theo từ khoá. */
function guidanceAnswer(q: string): string {
  const lq = q.toLowerCase();
  if (/m[aã] pin|đ[oổ]i pin/.test(lq))
    return "Để đổi mã PIN: vào Cài đặt → Bảo mật → Đổi mã PIN, nhập PIN cũ rồi PIN mới 6 số. Bạn cũng có thể nói \"đổi PIN\" và tôi sẽ dẫn bạn từng bước.";
  if (/h[aạ]n m[uứ]c|t[aă]ng h[aạ]n m[uứ]c/.test(lq))
    return "Hạn mức chuyển khoản mặc định là 100 triệu/ngày. Để tăng hạn mức, cần xác thực khuôn mặt (eKYC) theo QĐ 2345. Tôi có thể mở luồng nâng hạn mức nếu bạn muốn.";
  if (/qr|m[aã] qr/.test(lq))
    return "Để chuyển tiền bằng QR: bấm biểu tượng QR trên màn hình chính, quét mã người nhận, nhập số tiền rồi xác nhận. Giao dịch trên 10 triệu sẽ cần quét khuôn mặt.";
  if (/m[oở] th[eẻ]|l[aà]m th[eẻ]/.test(lq))
    return "Để mở thẻ mới: vào Thẻ → Mở thẻ, chọn loại thẻ và xác thực khuôn mặt. Thẻ ảo dùng được ngay, thẻ vật lý giao trong 3–5 ngày.";
  return "Tôi có thể hướng dẫn: đổi mã PIN, tăng hạn mức chuyển khoản, chuyển tiền bằng QR, mở thẻ mới… Bạn muốn được hướng dẫn việc nào?";
}

export function Assistant({ go, rate, launch, onLaunchHandled }: {
  go: (s: Screen) => void;
  rate?: (ctx: string) => void;
  launch?: "fraud" | "transfer" | null; // mở thẳng vào: cảnh báo gian lận | luồng chuyển tiền
  onLaunchHandled?: () => void;
}) {
  // Mở từ thông báo chủ động (launch="fraud") thì KHÔNG hiện tin chào — vào thẳng cảnh báo.
  const { profile, refresh } = useLiveData();
  const [msgs, setMsgs] = useState<Msg[]>(launch === "fraud" ? [] : WELCOME);
  const [baseLen] = useState(launch === "fraud" ? 0 : WELCOME.length);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const draft = useRef<Draft>({});
  const idRef = useRef(100);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasSession = msgs.length > baseLen;
  const endSession = () => (hasSession && rate ? rate("Trợ lý An") : go("home"));

  const nextId = () => ++idRef.current;
  const pushAn = (text?: string, card?: ChatCard) =>
    setMsgs((p) => [...p, { id: nextId(), from: "an", text, card }]);
  const pushUser = (text: string) =>
    setMsgs((p) => [...p, { id: nextId(), from: "user", text }]);

  useEffect(() => {
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    return () => clearTimeout(t);
  }, [msgs]);

  // ── Bắt đầu các luồng ──────────────────────────────────────────────────────
  function startTransfer() {
    draft.current = {};
    setStep("tf_to");
    pushAn("Bạn muốn chuyển tiền cho ai? Hãy cho tôi biết tên người nhận hoặc số tài khoản nhé.");
  }
  function startSavings() {
    draft.current = {};
    setStep("sv_amt");
    pushAn("Bạn muốn gửi tiết kiệm số tiền bao nhiêu?");
  }
  function startBillpay() {
    draft.current = {};
    setStep("bp_pick");
    pushAn("Bạn muốn thanh toán hoá đơn nào? (Điện, Nước, Internet, Học phí…)");
  }
  // —— Nhóm 2: chi tiêu (chỉ-đọc, hỏi đáp) ——
  function showSpending() {
    setStep("more");
    pushAn("Đây là bức tranh chi tiêu tháng này của bạn:", { kind: "spending" });
    const top = spendCategories[0];
    pushAn(`Tổng chi ${vnd(spendTotal)} — nhiều nhất là ${top.name} (${top.pct}%). Bạn muốn tôi giúp gì thêm không?`);
  }
  // —— Nhóm 2: dự báo dòng tiền ——
  function showForecast() {
    setStep("more");
    pushAn("Dự báo dòng tiền 30 ngày tới của bạn:", { kind: "forecast" });
    pushAn(`Cuối tháng tài khoản dự kiến chỉ còn ${vnd(forecast.endBalance)} — khá thấp. Bạn nên giảm chi ăn uống hoặc đặt mục tiêu gửi góp tự động. Cần tôi giúp gì thêm không?`);
  }
  // —— Nhóm 2: đặt mục tiêu tiết kiệm (slot-filling) ——
  function startGoal() {
    draft.current = {};
    setStep("sg_name");
    pushAn("Tuyệt! Bạn muốn đặt mục tiêu tiết kiệm cho việc gì? (ví dụ: du lịch, mua laptop, quỹ dự phòng…)");
  }
  // —— Nhóm 2: cảnh báo gian lận ——
  // proactive=true: bot CHỦ ĐỘNG báo (qua thông báo đẩy) thay vì người dùng hỏi.
  function showFraud(proactive = false) {
    setStep("fraud");
    pushAn(
      proactive ? undefined : "⚠️ Tôi vừa phát hiện một giao dịch đáng ngờ trên tài khoản của bạn:",
      { kind: "fraud" },
    );
  }

  // ── Nhóm 1 — luồng kế thừa ─────────────────────────────────────────────────
  // transaction: tra số dư & lịch sử giao dịch (chỉ-đọc).
  function showBalance() {
    setStep("more");
    refresh();  // kéo số dư & giao dịch mới nhất từ mockapi (thẻ tự cập nhật khi context đổi)
    const bal = profile?.account_balance ?? user.balance;
    pushAn(`Số dư khả dụng của bạn là ${vnd(bal)}. Vài giao dịch gần đây:`, { kind: "balance" });
    pushAn("Bạn cần tôi giúp gì thêm không?");
  }
  // card_lock: khoá thẻ — thao tác nhạy cảm, qua xác nhận → quét mặt (§7/§15).
  function startCardLock() {
    openSecure({
      cta: "Khoá thẻ",
      confirmCap: "Bạn muốn tạm khoá thẻ này? Mọi giao dịch sẽ bị chặn cho tới khi mở lại.",
      rows: [
        { label: "Thẻ", value: CARD_LABEL },
        { label: "Hành động", value: "Tạm khoá thẻ" },
        { label: "Hiệu lực", value: "Ngay lập tức" },
      ],
      authCap: "Để đảm bảo chính bạn yêu cầu, vui lòng xác thực khuôn mặt.",
      doneTitle: "Đã khoá thẻ",
      doneSub: `${CARD_LABEL} đã được tạm khoá. Bạn có thể mở lại bất cứ lúc nào.`,
      kind: "card",
    });
  }
  // service_lock: hỏi dịch vụ muốn khoá trước.
  function startServiceLock() {
    draft.current = {};
    setStep("sl_pick");
    pushAn("Bạn muốn tạm khoá dịch vụ nào? (Ngân hàng điện tử, Thanh toán online, hoặc Rút tiền ATM)");
  }
  // callback: đặt lịch gọi lại.
  function startCallback() {
    draft.current = {};
    setStep("cb_time");
    pushAn("Bạn muốn được gọi lại vào lúc nào? (ví dụ: 14:00 hôm nay, 9h sáng mai…)");
  }
  // card_swallowed: báo ATM nuốt thẻ.
  function startSwallowed() {
    draft.current = {};
    setStep("cs_loc");
    pushAn("Tôi rất tiếc về sự cố. Bạn bị nuốt thẻ ở ATM nào (chi nhánh/địa điểm)?");
  }
  // transfer: chuyển tổng đài viên (gặp người thật).
  function showAgent() {
    const code = "CS-" + ticketCode();
    setStep("more");
    pushAn("Tôi sẽ kết nối bạn tới tổng đài viên VoiceBank và đã chuyển tóm tắt cuộc trò chuyện để bạn không phải nói lại.", {
      kind: "ticket",
      ticket: {
        icon: "headset", title: "Đang kết nối tổng đài viên",
        rows: [
          { label: "Mã phiên", value: code },
          { label: "Hàng chờ", value: "Khoảng 3 phút" },
          { label: "Kênh", value: "Gọi thoại trong ứng dụng" },
        ],
        note: "Một nhân viên sẽ tiếp nhận ngay khi sẵn sàng.",
      },
    });
    pushAn("Trong lúc chờ, bạn cần tôi giúp gì thêm không?");
    recordUserAction({ op: "Gặp tổng đài viên", kind: "support", status: "Đang kết nối", detail: "Chuyển tới tổng đài viên kèm tóm tắt hội thoại", code });
  }
  // guidance: hướng dẫn how-to.
  function showGuidance(q: string) {
    setStep("more");
    pushAn(guidanceAnswer(q));
    pushAn("Bạn cần tôi hướng dẫn gì thêm không?");
  }
  // card_pin: tạo mới / đổi mã PIN thẻ (theo luồng VCB Digibank, xác thực SMS OTP).
  function startPin() {
    draft.current = {};
    setStep("pin_type");
    pushAn("Tạo mới/Đổi mã PIN thẻ — trong VCB Digibank: Quản lý dịch vụ Thẻ → Dịch vụ Thẻ khác → Tạo mới/Đổi mã PIN. Tôi sẽ hướng dẫn ngay tại đây. Bạn muốn đổi PIN cho loại thẻ nào? (Thẻ ghi nợ hoặc Thẻ tín dụng)");
  }

  // ── An tâm Gia đình (§7.5/§13) ─────────────────────────────────────────────
  // Vào lớp gia đình: hiện tổng quan liên kết + cảnh báo, rồi mời chọn việc.
  function startFamily() {
    draft.current = {};
    setStep("fam_menu");
    const activeCount = familyMembers.filter((m) => m.status === "active").length;
    pushAn(
      `An tâm Gia đình giúp bạn đồng hành tài chính cùng người thân theo "nguyên tắc một trục": bạn chỉ NHẬN cảnh báo & kết quả, không thao tác trên tài khoản của họ. Hiện bạn đang bảo vệ ${activeCount} người thân.`,
      { kind: "familyOverview" },
    );
    pushAn("Bạn muốn làm gì? Liên kết người thân mới, xem cảnh báo gần đây, hay xem tháng này mẹ tiêu thế nào?");
  }
  // family_link_flow: bước hỏi quan hệ → SĐT → thẻ xác nhận (giải thích một trục).
  function openFamilyConfirm() {
    const d = draft.current;
    const link: FamilyLink = { relation: d.famRelation!, phone4: d.famPhone4! };
    setStep("fam_confirm");
    pushAn("Vui lòng kiểm tra thông tin liên kết. Người thân sẽ cần tự đồng ý bằng giọng nói + eKYC trên máy của họ:", { kind: "familyLinkConfirm", link });
  }
  // family_alert_flow / parent_action_result: xem cảnh báo & kết quả (chỉ-đọc).
  function showFamilyAlerts() {
    setStep("more");
    pushAn("Đây là các cảnh báo & kết quả gần đây từ người thân của bạn:", { kind: "familyAlerts" });
    pushAn("Mọi việc đều được đẩy về real-time để bạn yên tâm. Bạn cần tôi giúp gì thêm không?");
  }
  // family_summary_flow: tóm tắt chi tiêu của người thân (chỉ-đọc, tôn trọng BR-FAM-05).
  function showFamilySummary() {
    setStep("more");
    pushAn("Tóm tắt chi tiêu tháng này của Mẹ (chỉ hiển thị tổng quan, không lộ số dư chi tiết theo quyền riêng tư):", { kind: "familySummary" });
    pushAn("Nếu thấy bất thường tôi sẽ cảnh báo ngay. Bạn cần tôi giúp gì thêm không?");
  }

  // Thông báo chủ động: mở Trợ lý An là Bot đẩy cảnh báo gian lận ngay.
  // Chỉ phụ thuộc `launch` + dựa vào cleanup để chạy đúng 1 lần (an toàn với StrictMode);
  // onLaunchHandled() reset launch=null nên effect không kích hoạt lại.
  useEffect(() => {
    if (!launch) return;
    const t = setTimeout(() => {
      if (launch === "fraud") showFraud(true);
      else if (launch === "transfer") startTransfer();
      onLaunchHandled?.();
    }, launch === "fraud" ? 650 : 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch]);

  /** Nhận diện ý định khi chưa ở trong luồng. Trả true nếu đã khởi động luồng. */
  function routeIntent(lq: string): boolean {
    // Nhóm 1 — giao dịch & dịch vụ (kiểm tra cụm cụ thể trước cụm chung)
    if (/(chuy[eể]n ti[eề]n|chuyen tien)/.test(lq)) { startTransfer(); return true; }
    if (/(m[uụ]c ti[eê]u|qu[yỹ]|đ[eể] d[aà]nh)/.test(lq)) { startGoal(); return true; }
    if (/(ti[eế]t ki[eệ]m|tiet kiem|g[uử]i ti[eề]n)/.test(lq)) { startSavings(); return true; }
    if (/(nu[oố]t th[eẻ]|gi[uữ] th[eẻ]|k[eẹ]t th[eẻ]|atm.*th[eẻ])/.test(lq)) { startSwallowed(); return true; }
    if (/(kho[aá] d[iị]ch v[uụ])/.test(lq)) { startServiceLock(); return true; }
    if (/(kho[aá] th[eẻ]|t[aạ]m kho[aá] th[eẻ])/.test(lq)) { startCardLock(); return true; }
    if (/(h[oó]a đơn|hoá đơn|hoa don|thanh to[aá]n)/.test(lq)) { startBillpay(); return true; }
    if (/(g[oọ]i l[aạ]i|h[eẹ]n g[oọ]i|đ[aặ]t l[iị]ch g[oọ]i)/.test(lq)) { startCallback(); return true; }
    if (/(t[oổ]ng đ[aà]i|nh[aâ]n vi[eê]n|t[uư] v[aấ]n vi[eê]n|ng[uư][oờ]i th[aậ]t|g[aặ]p ng[uư][oờ]i)/.test(lq)) { showAgent(); return true; }
    if (/(s[oố] d[uư]|l[iị]ch s[uử]|giao d[iị]ch g[aầ]n|sao k[eê]|bi[eế]n đ[oộ]ng)/.test(lq)) { showBalance(); return true; }
    // An tâm Gia đình — liên kết / theo dõi người thân (§7.5/§13)
    if (/(an t[aâ]m gia đ[iì]nh|gia đ[iì]nh|li[eê]n k[eế]t.*(m[eẹ]|b[oố]|ba|[oô]ng|b[aà]|ng[uư][oờ]i th[aâ]n|t[aà]i kho[aả]n)|ng[uư][oờ]i th[aâ]n|theo d[oõ]i (m[eẹ]|b[oố]|ba|gia đ[iì]nh))/.test(lq)) { startFamily(); return true; }
    // Nhóm 2 — Gen Z / dự báo
    if (/(chi ti[eê]u|ti[eê]u bao nhi[eê]u|ti[eê]u g[iì]|chi bao nhi[eê]u)/.test(lq)) { showSpending(); return true; }
    if (/(d[uự] b[aá]o|cu[oố]i th[aá]ng|ch[aá]y t[uú]i|d[oò]ng ti[eề]n)/.test(lq)) { showForecast(); return true; }
    if (/(gian l[aậ]n|l[uừ]a đ[aả]o|b[aấ]t th[uư][oờ]ng|đ[aá]ng ng[oờ]|c[aả]nh b[aá]o|gi[aả] m[aạ]o)/.test(lq)) { showFraud(); return true; }
    if (/(đ[oổ]i (m[aã] )?pin|t[aạ]o (m[aã] )?pin|m[aã] pin|đ[oổ]i m[aậ]t kh[aẩ]u th[eẻ])/.test(lq)) { startPin(); return true; }
    // how-to — cụm chung, kiểm tra cuối cùng
    if (/(h[uư][oớ]ng d[aẫ]n|l[aà]m th[eế] n[aà]o|l[aà]m sao|c[aá]ch )/.test(lq)) { showGuidance(lq); return true; }
    return false;
  }

  function openConfirm(receipt: Receipt) {
    draft.current.receipt = receipt;
    setStep("confirm");
    pushAn("Vui lòng kiểm tra lại thông tin:", { kind: "confirm", receipt });
  }
  function openGoalConfirm(plan: GoalPlan) {
    setStep("sg_confirm");
    pushAn("Xác nhận mục tiêu tiết kiệm của bạn:", { kind: "goalConfirm", plan });
  }

  // ── Nhận một câu của người dùng (gõ hoặc nói) ──────────────────────────────
  function handleUserText(text: string) {
    pushUser(text);
    if (step) return advanceFlow(text);
    if (routeIntent(text.toLowerCase())) return;
    pushAn(getReply(text));
  }

  // ── Tiến qua từng bước ─────────────────────────────────────────────────────
  function advanceFlow(text: string) {
    const d = draft.current;

    // —— Luồng chuyển tiền ——
    if (step === "tf_to") {
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 6) { d.account = text.trim(); d.recipient = "Chủ TK ••" + digits.slice(-4); }
      else { d.recipient = text.trim(); d.account = "•••• 6789"; }
      d.bank = "Vietcombank";
      setStep("tf_amt");
      pushAn(`Đã tìm thấy người nhận: ${d.recipient} · ${d.bank}. Bạn muốn chuyển bao nhiêu tiền?`);
      return;
    }
    if (step === "tf_amt") {
      const amt = parseVnd(text);
      if (!amt || amt < 1000) { pushAn('Tôi chưa nhận ra số tiền. Bạn nhập lại giúp tôi nhé (ví dụ: "2.000.000" hoặc "2 triệu").'); return; }
      d.amount = amt;
      setStep("tf_note");
      pushAn(`Chuyển ${vnd(amt)}. Bạn muốn ghi lời nhắn không? Gõ nội dung hoặc chọn "Bỏ qua".`);
      return;
    }
    if (step === "tf_note") {
      const skip = /^(bỏ qua|bo qua|kh[oô]ng|ko)$/i.test(text.trim());
      d.note = skip ? "Chuyen tien" : text.trim();
      openConfirm({
        opName: "Chuyển tiền",
        amount: d.amount!,
        subtitle: `đến ${d.recipient} · ${d.bank}`,
        rows: [
          { label: "Người nhận", value: d.recipient! },
          { label: "Ngân hàng", value: d.bank! },
          { label: "Số tài khoản", value: d.account! },
          { label: "Số tiền", value: vnd(d.amount!) },
          { label: "Nội dung", value: d.note! },
        ],
      });
      return;
    }

    // —— Luồng mở tiết kiệm ——
    if (step === "sv_amt") {
      const amt = parseVnd(text);
      if (!amt || amt < 100000) { pushAn('Số tiền gửi tối thiểu là 100.000đ. Bạn nhập lại giúp tôi nhé (ví dụ: "10 triệu").'); return; }
      d.amount = amt;
      setStep("sv_term");
      pushAn("Bạn chọn kỳ hạn bao lâu? (3, 6 hoặc 12 tháng)");
      return;
    }
    if (step === "sv_term") {
      const term = parseTerm(text);
      const rateY = savingsOffer.terms.find((t) => t.months === term)?.rate ?? savingsOffer.rate;
      const interest = Math.round(d.amount! * (rateY / 100) * (term / 12));
      const maturity = d.amount! + interest;
      d.term = term;
      openConfirm({
        opName: "Mở sổ tiết kiệm",
        amount: d.amount!,
        subtitle: `${term} tháng · ${rateY}%/năm`,
        rows: [
          { label: "Số tiền gửi", value: vnd(d.amount!) },
          { label: "Kỳ hạn", value: `${term} tháng` },
          { label: "Lãi suất", value: `${rateY}%/năm` },
          { label: "Lãi dự kiến", value: `+${vnd(interest)}` },
          { label: "Nhận khi đáo hạn", value: vnd(maturity) },
        ],
      });
      return;
    }

    // —— Luồng thanh toán hoá đơn ——
    if (step === "bp_pick") {
      const b = findBiller(text);
      if (!b) { pushAn("Tôi chưa rõ hoá đơn bạn cần. Bạn chọn: Điện, Nước, Internet hoặc Học phí nhé."); return; }
      d.amount = b.amount;
      d.bill = { service: b.category, provider: b.provider, code: b.code };
      openConfirm({
        opName: "Thanh toán hoá đơn",
        amount: b.amount,
        subtitle: `${b.category} · ${b.provider}`,
        rows: [
          { label: "Dịch vụ", value: b.category },
          { label: "Nhà cung cấp", value: b.provider },
          { label: "Chi tiết", value: b.detail },
          { label: "Mã hoá đơn", value: b.code },
          { label: "Số tiền", value: vnd(b.amount) },
        ],
      });
      return;
    }

    // —— Luồng đặt mục tiêu tiết kiệm ——
    if (step === "sg_name") {
      d.goalName = text.trim().replace(/^(quỹ|quy)\s+/i, "");
      setStep("sg_target");
      pushAn(`Mục tiêu "${d.goalName}" — bạn cần tiết kiệm tổng cộng bao nhiêu?`);
      return;
    }
    if (step === "sg_target") {
      const amt = parseVnd(text);
      if (!amt || amt < 500000) { pushAn('Mục tiêu tối thiểu 500.000đ. Bạn nhập lại giúp tôi nhé (ví dụ: "30 triệu").'); return; }
      d.goalTarget = amt;
      setStep("sg_auto");
      const suggest = Math.max(500_000, Math.round(amt / 10 / 100_000) * 100_000);
      pushAn(`Để đạt ${vnd(amt)}, bạn muốn gửi góp tự động mỗi tháng bao nhiêu? (gợi ý: ${vnd(suggest)}/tháng)`);
      return;
    }
    if (step === "sg_auto") {
      const auto = parseVnd(text);
      if (!auto || auto < 100000) { pushAn('Mức gửi góp tối thiểu 100.000đ/tháng. Bạn nhập lại giúp tôi nhé.'); return; }
      d.goalAuto = auto;
      const months = Math.max(1, Math.ceil(d.goalTarget! / auto));
      openGoalConfirm({ name: d.goalName!, target: d.goalTarget!, auto, months });
      return;
    }

    // —— Luồng khoá dịch vụ: chọn dịch vụ ——
    if (step === "sl_pick") {
      const svc = matchService(text);
      openSecure({
        cta: "Khoá dịch vụ",
        confirmCap: `Bạn muốn tạm khoá dịch vụ "${svc}"?`,
        rows: [
          { label: "Dịch vụ", value: svc },
          { label: "Hành động", value: "Tạm khoá" },
          { label: "Hiệu lực", value: "Ngay lập tức" },
        ],
        authCap: "Vui lòng xác thực khuôn mặt để khoá dịch vụ.",
        doneTitle: "Đã khoá dịch vụ",
        doneSub: `Dịch vụ "${svc}" đã được tạm khoá. Bạn có thể mở lại bất cứ lúc nào.`,
        kind: "service",
        serviceLabel: svc,
      });
      return;
    }

    // —— Luồng đặt lịch gọi lại ——
    if (step === "cb_time") {
      const when = text.trim();
      const code = "CB-" + ticketCode();
      setStep("more");
      pushAn("Đã đặt lịch gọi lại cho bạn:", {
        kind: "ticket",
        ticket: {
          icon: "phone", title: "Đã đặt lịch gọi lại",
          rows: [
            { label: "Mã yêu cầu", value: code },
            { label: "Thời gian", value: when },
            { label: "Số liên hệ", value: "••• ••• " + user.account.slice(-3) },
          ],
          note: "Tổng đài viên sẽ chủ động gọi cho bạn đúng khung giờ đã chọn.",
        },
      });
      pushAn("Bạn cần tôi giúp gì thêm không?");
      recordUserAction({ op: "Đặt lịch gọi lại", kind: "support", status: "Đã đặt lịch", detail: `Khung giờ: ${when}`, code, userSaid: text });
      return;
    }

    // —— Luồng báo ATM nuốt thẻ ——
    if (step === "cs_loc") {
      const loc = text.trim();
      const code = "ATM-" + ticketCode();
      setStep("more");
      pushAn("Tôi đã ghi nhận và tạo phiếu hỗ trợ khẩn cấp:", {
        kind: "ticket",
        ticket: {
          icon: "card", title: "Đã tiếp nhận báo ATM nuốt thẻ",
          rows: [
            { label: "Mã sự cố", value: code },
            { label: "Địa điểm", value: loc },
            { label: "Thẻ", value: CARD_LABEL },
            { label: "Trạng thái", value: "Đang xử lý" },
          ],
          note: "Để an toàn, bạn nên tạm khoá thẻ ngay. Tôi có thể giúp khoá nếu bạn muốn.",
        },
      });
      pushAn("Bạn có muốn khoá thẻ ngay, hay cần tôi giúp gì khác không?");
      recordUserAction({ op: "Báo ATM nuốt thẻ", kind: "support", status: "Đang xử lý", detail: `Địa điểm: ${loc}`, code, userSaid: text });
      return;
    }

    // —— Luồng đổi/tạo mã PIN thẻ ——
    if (step === "pin_type") {
      const credit = /t[ií]n d[uụ]ng|credit|visa|master/.test(text.toLowerCase());
      d.cardType = credit ? "Thẻ tín dụng" : "Thẻ ghi nợ";
      d.cardNo = credit ? "4970 ••••  8821" : "970436 ••••  0037";
      d.brand = credit ? "Visa" : "Connect 24";
      setStep("pin_new");
      pushAn(`Đã chọn ${d.cardType} · ${d.cardNo}. Vui lòng nhập mã PIN mới gồm 6 chữ số.`);
      return;
    }
    if (step === "pin_new") {
      const pin = text.replace(/\D/g, "");
      if (pin.length !== 6) { pushAn("Mã PIN phải gồm đúng 6 chữ số. Bạn nhập lại giúp tôi nhé."); return; }
      d.pin = pin;
      setStep("pin_re");
      pushAn("Vui lòng nhập lại mã PIN để xác nhận.");
      return;
    }
    if (step === "pin_re") {
      const pin = text.replace(/\D/g, "");
      if (pin !== d.pin) { pushAn("Hai lần nhập mã PIN chưa khớp. Vui lòng nhập lại mã PIN mới (6 chữ số)."); setStep("pin_new"); return; }
      setStep("pin_review");
      pushAn("Vui lòng kiểm tra lại thông tin và chọn xác nhận:", { kind: "pinConfirm", info: pinInfo() });
      return;
    }
    if (step === "pin_otp") {
      const otp = text.replace(/\D/g, "");
      if (otp.length !== 6) { pushAn("Mã OTP gồm 6 chữ số. Bạn nhập lại giúp tôi nhé."); return; }
      const txn = txnCode();
      setStep("more");
      pushAn(undefined, { kind: "pinSuccess", info: pinInfo(), txn });
      pushAn("Quý khách đã tạo mới/đổi mã PIN thành công. Vì lý do bảo mật, vui lòng ghi nhớ và không tiết lộ mã PIN. Bạn cần tôi giúp gì thêm không?");
      recordUserAction({ op: "Đổi mã PIN thẻ", kind: "support", status: "Thành công", detail: `${d.cardType} · ${d.cardNo} · ${d.brand} · ${d.authMethod ?? "SMS OTP"}`, code: txn });
      return;
    }

    // —— Luồng An tâm Gia đình ——
    if (step === "fam_menu") {
      const lq = text.toLowerCase();
      if (/(li[eê]n k[eế]t|th[eê]m|ng[uư][oờ]i th[aâ]n m[oớ]i|m[oớ]i)/.test(lq)) {
        setStep("fam_relation");
        pushAn("Bạn muốn liên kết tài khoản cho ai? (ví dụ: Mẹ, Bố, Ông, Bà…)");
        return;
      }
      if (/(c[aả]nh b[aá]o|k[eế]t qu[aả]|th[oô]ng b[aá]o|g[aầ]n đ[aâ]y)/.test(lq)) { showFamilyAlerts(); return; }
      if (/(ti[eê]u|chi ti[eê]u|t[oó]m t[aắ]t|t[iì]nh h[iì]nh|th[eế] n[aà]o)/.test(lq)) { showFamilySummary(); return; }
      pushAn("Bạn chọn giúp tôi: Liên kết người thân mới, Xem cảnh báo gần đây, hoặc Tháng này mẹ tiêu thế nào nhé.");
      return;
    }
    if (step === "fam_relation") {
      d.famRelation = text.trim().replace(/^(cho|của)\s+/i, "");
      setStep("fam_phone");
      pushAn(`Bạn cho tôi số điện thoại tài khoản VCB của ${d.famRelation} để gửi yêu cầu liên kết nhé.`);
      return;
    }
    if (step === "fam_phone") {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 4) { pushAn("Tôi chưa nhận ra số điện thoại. Bạn nhập lại giúp tôi nhé (ví dụ: 0901 234 567)."); return; }
      d.famPhone4 = digits.slice(-4);
      openFamilyConfirm();
      return;
    }

    // —— Bot hỏi "còn gì nữa không?" ——
    if (step === "more") {
      const lq = text.toLowerCase();
      if (/(kh[oô]ng|ko\b|th[oô]i|d[uừ]ng|k[eế]t th[uú]c|c[aả]m [oơ]n)/.test(lq)) {
        setStep(null);
        pushAn("Cảm ơn bạn đã sử dụng VoiceBank! 👋");
        setTimeout(() => (rate ? rate("Trợ lý An") : go("home")), 500); // kết thúc phiên → đánh giá
        return;
      }
      if (routeIntent(lq)) return;
      pushAn("Bạn muốn làm gì tiếp? Tôi có thể giúp chuyển tiền, mở tiết kiệm, đặt mục tiêu, xem chi tiêu hoặc dự báo dòng tiền.");
      return;
    }
    // confirm / auth / fraud / sg_confirm: thao tác qua thẻ, bỏ qua text rời.
  }

  // ── Hành động trên thẻ ─────────────────────────────────────────────────────
  function onConfirm() {
    pushUser("Xác nhận");
    setStep("auth");
    pushAn("Để bảo mật, vui lòng xác thực khuôn mặt để hoàn tất.", { kind: "auth", receipt: draft.current.receipt! });
  }
  function onCancel() {
    pushUser("Huỷ giao dịch");
    setStep(null);
    draft.current = {};
    pushAn("Đã huỷ giao dịch. Tôi có thể giúp gì khác cho bạn?");
  }
  function onAuthed() {
    const d = { ...draft.current };
    const r = d.receipt!;
    setStep("more");
    pushAn(undefined, { kind: "success", receipt: r });
    pushAn("Bạn có muốn thực hiện thao tác nào khác không?");
    recordUserAction({ op: r.opName, amount: r.amount, detail: r.subtitle });
    // Phase 6: ghi thật vào Mock Bank Core để áp dụng §7 (số dư trừ thật, eKYC>10tr…).
    if (r.opName === "Chuyển tiền") void syncTransferToBackend(d);
    else if (r.opName === "Mở sổ tiết kiệm") void syncSavingsToBackend(d);
    else if (r.opName === "Thanh toán hoá đơn") void syncBillpayToBackend(d);
  }

  // Chuyển tiền thật qua mockapi: verify → (eKYC nếu >10tr) → execute → làm mới số dư.
  // Fire-and-forget: backend offline/lỗi → giữ nguyên trải nghiệm local đã hiển thị.
  async function syncTransferToBackend(d: Draft) {
    try {
      const digits = (d.account || "").replace(/\D/g, "");
      const recipient_account = digits.length >= 6 ? digits : "0011000999888";
      const amount = d.amount!;
      const v = await bankApi.transferVerify({ amount, recipient_account, note: d.note });
      if (v.status === "pending_kyc") await bankApi.kycVerify(v.challenge_id);
      await bankApi.transferExecute({
        amount, recipient_account, note: d.note,
        recipient_name: d.recipient,  // hiển thị đúng người nhận đã chọn trong lịch sử
        challenge_id: v.challenge_id, idempotency_key: `tf-${Date.now()}`,
      });
      refresh();  // số dư trên Trang chủ cập nhật theo giao dịch vừa thực hiện
    } catch {
      /* backend chưa sẵn sàng → demo vẫn chạy bằng dữ liệu local */
    }
  }

  // Mở sổ tiết kiệm thật: trừ gốc ngay (BR-SAV-06) + ghi sổ → làm mới số dư.
  async function syncSavingsToBackend(d: Draft) {
    try {
      await bankApi.savingsOpen({ amount: d.amount!, term_months: d.term ?? 6 });
      refresh();
    } catch {
      /* offline → giữ trải nghiệm local */
    }
  }

  // Thanh toán hoá đơn thật: trừ tài khoản + ghi giao dịch → làm mới số dư & lịch sử.
  async function syncBillpayToBackend(d: Draft) {
    try {
      await bankApi.billPay({
        service: d.bill?.service ?? "Hoá đơn",
        biller: d.bill?.provider,
        bill_code: d.bill?.code,
        amount: d.amount!,
      });
      refresh();
    } catch {
      /* offline → giữ trải nghiệm local */
    }
  }
  // Mục tiêu tiết kiệm: lập mục tiêu là thiết lập gửi góp (không phải giao dịch giá
  // trị lớn) → không cần eKYC, xác nhận xong là tạo luôn + gamification.
  function onGoalConfirm() {
    const d = draft.current;
    const plan: GoalPlan = {
      name: d.goalName!, target: d.goalTarget!, auto: d.goalAuto!,
      months: Math.max(1, Math.ceil(d.goalTarget! / d.goalAuto!)),
    };
    pushUser("Tạo mục tiêu");
    setStep("more");
    pushAn(undefined, { kind: "goalDone", plan });
    pushAn("Đã lập mục tiêu và bật gửi góp tự động cho bạn! 🎉 Bạn muốn làm gì tiếp không?");
    recordUserAction({ op: "Đặt mục tiêu tiết kiệm", amount: plan.target, detail: `${plan.name} · ${vnd(plan.auto)}/tháng` });
  }
  // Cảnh báo gian lận: 2 hướng xử lý.
  function onFraudSafe() {
    pushUser("Đúng là giao dịch của tôi");
    setStep("more");
    pushAn("Đã ghi nhận đây là giao dịch hợp lệ. Tôi sẽ tiếp tục theo dõi để bảo vệ tài khoản của bạn. Cần tôi giúp gì thêm không?");
    recordUserAction({ op: "Xử lý cảnh báo gian lận", kind: "fraud", amount: fraudAlert.amount, status: "Xác nhận hợp lệ", detail: `${fraudAlert.merchant} · ${fraudAlert.place}` });
  }
  // Khoá thẻ là thao tác bảo mật nhạy cảm → BẮT BUỘC xác thực khuôn mặt trước (§7/§15).
  function onFraudLock() {
    pushUser("Không phải tôi — khoá thẻ ngay");
    setStep("fraud_auth");
    pushAn("Để đảm bảo chính bạn yêu cầu, vui lòng xác thực khuôn mặt trước khi tôi khoá thẻ.", { kind: "fraudAuth" });
  }
  function onFraudLocked() {
    setStep("more");
    pushAn(undefined, { kind: "lockDone" });
    pushAn("Đã khoá thẻ khẩn cấp. Bạn cần tôi giúp gì thêm không?");
    recordUserAction({ op: "Khoá thẻ khẩn cấp (gian lận)", kind: "fraud", status: "Đã khoá", detail: `${CARD_LABEL} · do giao dịch nghi gian lận` });
    void (async () => { try { await bankApi.cardLock(); refresh(); } catch { /* offline */ } })();
  }

  // —— Thao tác bảo mật chung (card_lock / service_lock): xác nhận → quét mặt → xong ——
  function openSecure(op: SecureOp) {
    draft.current.secure = op;
    setStep("sec_confirm");
    pushAn(op.confirmCap, { kind: "secureConfirm", op });
  }
  function onSecureConfirm() {
    const op = draft.current.secure!;
    pushUser(op.cta);
    setStep("sec_auth");
    pushAn(op.authCap, { kind: "secureAuth", op });
  }
  function onSecureAuthed() {
    const op = draft.current.secure!;
    setStep("more");
    pushAn(undefined, { kind: "secureDone", op });
    pushAn("Bạn cần tôi giúp gì thêm không?");
    recordUserAction({ op: op.doneTitle, kind: "support", status: "Đã khoá", detail: op.doneSub });
    void syncSecureToBackend(op);
  }

  // Khoá thẻ / khoá dịch vụ thật qua mockapi → trạng thái thẻ trên Trang chủ đổi theo.
  async function syncSecureToBackend(op: SecureOp) {
    try {
      if (op.kind === "card") { await bankApi.cardLock(); refresh(); return; }
      if (op.kind === "service" && op.serviceLabel) {
        const name = backendServiceName(op.serviceLabel);
        if (name) { await bankApi.serviceLock(name); refresh(); }
      }
    } catch {
      /* offline → giữ trải nghiệm local */
    }
  }
  // —— Đổi/tạo mã PIN: màn xác nhận thông tin (bước 4) → SMS OTP (bước 5) ——
  function pinInfo(): PinInfo {
    const d = draft.current;
    return { cardType: d.cardType!, cardNo: d.cardNo!, brand: d.brand! };
  }
  function onPinConfirm(method: string) {
    draft.current.authMethod = method;
    pushUser(`Xác nhận · ${method}`);
    setStep("pin_otp");
    if (method === "Smart OTP")
      pushAn("Vui lòng mở mục Smart OTP trong ứng dụng để lấy mã gồm 6 số, rồi nhập vào đây để hoàn tất.");
    else
      pushAn("Đã gửi mã OTP gồm 6 số tới số điện thoại ••• ••• 079. Vui lòng nhập mã OTP để hoàn tất.");
  }

  // —— An tâm Gia đình: gửi yêu cầu liên kết → chờ người thân đồng ý (BR-FAM-01) ——
  function famLink(): FamilyLink {
    const d = draft.current;
    return { relation: d.famRelation!, phone4: d.famPhone4! };
  }
  function onFamilyLinkSend() {
    const link = famLink();
    pushUser("Gửi yêu cầu liên kết");
    setStep("fam_pending");
    pushAn(
      `Đã gửi yêu cầu liên kết tới ${link.relation} (••••${link.phone4}). Liên kết sẽ kích hoạt khi ${link.relation} tự đồng ý bằng giọng nói + eKYC trên máy của họ.`,
      { kind: "familyPending", link },
    );
    recordUserAction({ op: "Liên kết gia đình", kind: "support", status: "Chờ đồng ý", detail: `${link.relation} ••••${link.phone4} · chờ giọng nói + eKYC`, code: "FAM-" + ticketCode() });
    // Người thân tự đồng ý trên máy của họ → kết quả quay về máy bạn (vòng lặp một trục).
    setTimeout(() => onFamilyConsent(), 2000);
  }
  function onFamilyConsent() {
    const link = famLink();
    setStep("more");
    pushAn(undefined, { kind: "familyActive", link });
    pushAn(`Tuyệt vời! Liên kết với ${link.relation} đã kích hoạt. Từ giờ mọi cảnh báo & kết quả từ ${link.relation} sẽ được đẩy về cho bạn real-time. Bạn cần tôi giúp gì thêm không?`);
    recordUserAction({ op: "Liên kết gia đình", kind: "support", status: "Đã kích hoạt", detail: `${link.relation} ••••${link.phone4} · đồng ý giọng nói + eKYC (BR-FAM-01)` });
  }

  // ── Mic: mô phỏng nói theo ngữ cảnh từng bước ──────────────────────────────
  const handleMic = () => {
    if (listening) { setListening(false); return; }
    if (step === "confirm" || step === "auth" || step === "fraud" || step === "fraud_auth"
      || step === "sg_confirm" || step === "sec_confirm" || step === "sec_auth"
      || step === "pin_review" || step === "fam_confirm" || step === "fam_pending") return; // thao tác qua thẻ
    setListening(true);
    setTimeout(() => {
      setListening(false);
      if (!step) return handleUserText("Tôi muốn chuyển tiền");
      if (step === "tf_to") return handleUserText("Nguyễn Văn Bình");
      if (step === "tf_amt") return handleUserText("2 triệu");
      if (step === "tf_note") return handleUserText("Tiền ăn trưa");
      if (step === "sv_amt") return handleUserText("10 triệu");
      if (step === "sv_term") return handleUserText("6 tháng");
      if (step === "bp_pick") return handleUserText("Điện EVN");
      if (step === "sg_name") return handleUserText("Du lịch Nhật Bản");
      if (step === "sg_target") return handleUserText("30 triệu");
      if (step === "sg_auto") return handleUserText("3 triệu");
      if (step === "sl_pick") return handleUserText("Ngân hàng điện tử");
      if (step === "cb_time") return handleUserText("14:00 hôm nay");
      if (step === "cs_loc") return handleUserText("ATM Vietcombank Lê Lợi, Q1");
      if (step === "pin_type") return handleUserText("Thẻ ghi nợ");
      if (step === "pin_new") return handleUserText("246810");
      if (step === "pin_re") return handleUserText("246810");
      if (step === "pin_otp") return handleUserText("135790");
      if (step === "fam_menu") return handleUserText("Liên kết người thân mới");
      if (step === "fam_relation") return handleUserText("Mẹ");
      if (step === "fam_phone") return handleUserText("0901 234 567");
      if (step === "more") return handleUserText("Không, cảm ơn");
    }, 1500);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    handleUserText(text.trim());
    setInput("");
  };

  const onSuggest = (s: { label: string; act: SuggestAct }) => {
    if (s.act === "transfer") return startTransfer();
    if (s.act === "spending") return showSpending();
    if (s.act === "forecast") return showForecast();
    return startGoal();
  };

  // Gợi ý trả lời nhanh theo bước hiện tại.
  const quickReplies =
    step === "tf_to" ? ["Nguyễn Văn Bình", "Trần Thị Lan", "0123456789"]
    : step === "tf_amt" ? ["500.000", "1.000.000", "2.000.000"]
    : step === "tf_note" ? ["Bỏ qua", "Tiền ăn", "Trả nợ"]
    : step === "sv_amt" ? ["5.000.000", "10.000.000", "20.000.000"]
    : step === "sv_term" ? ["3 tháng", "6 tháng", "12 tháng"]
    : step === "bp_pick" ? ["Điện EVN", "Nước", "Internet", "Học phí"]
    : step === "sg_name" ? ["Du lịch Nhật Bản", "Mua laptop", "Quỹ dự phòng"]
    : step === "sg_target" ? ["10.000.000", "30.000.000", "50.000.000"]
    : step === "sg_auto" ? ["1.000.000", "3.000.000", "5.000.000"]
    : step === "sl_pick" ? ["Ngân hàng điện tử", "Thanh toán online", "Rút tiền ATM"]
    : step === "cb_time" ? ["14:00 hôm nay", "9:00 sáng mai", "Càng sớm càng tốt"]
    : step === "cs_loc" ? ["ATM Vietcombank Lê Lợi", "ATM gần nhà", "Không nhớ rõ"]
    : step === "pin_type" ? ["Thẻ ghi nợ", "Thẻ tín dụng"]
    : step === "pin_otp" ? ["135790"]
    : step === "fam_menu" ? ["Liên kết người thân mới", "Xem cảnh báo gần đây", "Tháng này mẹ tiêu thế nào?"]
    : step === "fam_relation" ? ["Mẹ", "Bố", "Ông", "Bà"]
    : step === "fam_phone" ? ["0901 234 567", "0912 888 999"]
    : step === "more" ? ["Xem số dư", "Khoá thẻ", "Không, cảm ơn"]
    : [];

  const inputLocked = step === "confirm" || step === "auth" || step === "fraud" || step === "fraud_auth"
    || step === "sg_confirm" || step === "sec_confirm" || step === "sec_auth" || step === "pin_review"
    || step === "fam_confirm" || step === "fam_pending";

  return (
    <div className="fade" style={{
      display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
      background: "linear-gradient(180deg, #edf2ee 0%, #f5fbf7 40%, #ffffff 100%)",
    }}>
      <AppBar title="Trợ lý An" onBack={endSession} />

      {/* robot avatar */}
      <div className="an-hero">
        <div className={`an-orb${listening ? " pulse" : ""}`}>
          <Robot size="lg" />
        </div>
        <div className="an-status">
          {listening
            ? <><Waveform bars={14} /><span className="muted tiny"> Đang nghe…</span></>
            : <span className="muted tiny">An đang chờ câu hỏi của bạn</span>
          }
        </div>
      </div>

      {/* chat area */}
      <div className="chat-scroll">
        {msgs.map((m) => {
          if (m.card) {
            const c = m.card;
            return (
              <div key={m.id} className="msg-card">
                {m.text && <div className="msg-card-cap">{m.text}</div>}
                {c.kind === "confirm" && (
                  <ConfirmCard r={c.receipt} active={step === "confirm"} onConfirm={onConfirm} onCancel={onCancel} />
                )}
                {c.kind === "auth" && (
                  <AuthCard active={step === "auth"} onAuthed={onAuthed} />
                )}
                {c.kind === "success" && (
                  <SuccessCard r={c.receipt} />
                )}
                {c.kind === "spending" && <SpendingCard />}
                {c.kind === "forecast" && <ForecastCard />}
                {c.kind === "fraud" && (
                  <FraudCard active={step === "fraud"} onSafe={onFraudSafe} onLock={onFraudLock} />
                )}
                {c.kind === "fraudAuth" && (
                  <AuthCard active={step === "fraud_auth"} onAuthed={onFraudLocked} />
                )}
                {c.kind === "lockDone" && <LockDoneCard />}
                {c.kind === "goalConfirm" && (
                  <GoalConfirmCard plan={c.plan} active={step === "sg_confirm"} onConfirm={onGoalConfirm} onCancel={onCancel} />
                )}
                {c.kind === "goalDone" && <GoalDoneCard plan={c.plan} />}
                {c.kind === "balance" && <BalanceCard />}
                {c.kind === "secureConfirm" && (
                  <SecureConfirmCard op={c.op} active={step === "sec_confirm"} onConfirm={onSecureConfirm} onCancel={onCancel} />
                )}
                {c.kind === "secureAuth" && (
                  <AuthCard active={step === "sec_auth"} onAuthed={onSecureAuthed} />
                )}
                {c.kind === "secureDone" && <SecureDoneCard op={c.op} />}
                {c.kind === "ticket" && <TicketCard t={c.ticket} />}
                {c.kind === "pinConfirm" && (
                  <PinConfirmCard info={c.info} active={step === "pin_review"} onConfirm={onPinConfirm} onCancel={onCancel} />
                )}
                {c.kind === "pinSuccess" && <PinSuccessCard info={c.info} txn={c.txn} />}
                {c.kind === "familyOverview" && <FamilyOverviewCard />}
                {c.kind === "familyLinkConfirm" && (
                  <FamilyLinkConfirmCard link={c.link} active={step === "fam_confirm"} onSend={onFamilyLinkSend} onCancel={onCancel} />
                )}
                {c.kind === "familyPending" && <FamilyPendingCard link={c.link} />}
                {c.kind === "familyActive" && <FamilyActiveCard link={c.link} />}
                {c.kind === "familyAlerts" && <FamilyAlertsCard />}
                {c.kind === "familySummary" && <FamilySummaryCard />}
              </div>
            );
          }
          return (
            <div key={m.id} className={`bubble-row ${m.from}`}>
              {m.from === "an" && (
                <span className="bubble-av">
                  <Icon.sparkle size={14} style={{ color: "#fff" }} />
                </span>
              )}
              <div className={`bubble ${m.from}`}>{m.text}</div>
            </div>
          );
        })}

        {!step && msgs.length <= 2 && (
          <div className="sugg-row">
            {SUGGESTIONS.map((s) => (
              <button key={s.label} className="sugg-chip" onClick={() => onSuggest(s)}>{s.label}</button>
            ))}
          </div>
        )}

        {hasSession && !step && (
          <div className="end-session-row">
            <button className="end-session-btn" onClick={endSession}>
              <Icon.power size={16} /> Kết thúc phiên
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* quick replies cho bước hiện tại */}
      {quickReplies.length > 0 && (
        <div className="qreplies">
          {quickReplies.map((q) => (
            <button key={q} className="qchip" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* input bar */}
      <div className="chat-bar">
        <button
          className={`mic-btn${listening ? " active" : ""}`}
          onClick={handleMic}
          disabled={inputLocked}
          aria-label={listening ? "Dừng nghe" : "Bắt đầu nghe"}
        >
          <Icon.mic size={22} />
        </button>
        <input
          className="chat-input"
          type="text"
          placeholder={inputLocked ? "Hãy chọn thao tác ở trên…" : "Nhập yêu cầu, ví dụ: tôi muốn chuyển tiền…"}
          value={input}
          disabled={inputLocked}
          onChange={(e) => setInput(e.target.value)}
          // Bỏ qua Enter khi IME tiếng Việt còn đang ghép chữ (isComposing / keyCode 229),
          // nếu không sẽ gửi thiếu âm tiết cuối → bong bóng hiển thị sai chữ vừa gõ.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) send(input);
          }}
        />
        <button className="send-btn" onClick={() => send(input)} disabled={!input.trim() || inputLocked}>
          <Icon.send size={20} />
        </button>
      </div>

      <ActionChips onSettings={go} />
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ── Thẻ xác nhận giao dịch (trong chat) ── */
function ConfirmCard({ r, active, onConfirm, onCancel }: { r: Receipt; active: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="card">
      {r.rows.map((row) => (
        <div className="kv" key={row.label}>
          <span className="kv-k">{row.label}</span>
          <span className="kv-v" style={row.label === "Số tiền" || row.label === "Số tiền gửi" ? { fontWeight: 800, fontSize: 16 } : undefined}>{row.value}</span>
        </div>
      ))}
      {active ? (
        <div className="chat-card-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Huỷ</button>
          <button className="btn btn-primary" onClick={onConfirm}><Icon.checkCircle size={17} /> Xác nhận</button>
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã xử lý</div>
      )}
    </div>
  );
}

/* ── Thẻ xác thực: quét khuôn mặt THẬT (camera) trong chat ── */
function AuthCard({ active, onAuthed }: { active: boolean; onAuthed: () => void }) {
  if (!active) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <span className="muted tiny"><Icon.checkCircle size={14} style={{ color: "var(--g600)" }} /> Đã xác thực</span>
      </div>
    );
  }
  return (
    <div className="card">
      <FaceKyc onComplete={onAuthed} intro={false} />
    </div>
  );
}

/* ── Thẻ thành công (Bot sẽ hỏi tiếp ở bong bóng kế) ── */
function SuccessCard({ r }: { r: Receipt }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
        <Icon.checkCircle size={36} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{r.opName} thành công</div>
      <div style={{ fontWeight: 900, fontSize: 24, color: "var(--g700)", marginTop: 4 }}>{vnd(r.amount)}</div>
      <div className="muted tiny" style={{ marginTop: 2 }}>{r.subtitle}</div>
    </div>
  );
}

/* ── Nhóm 2: thẻ chi tiêu theo danh mục (spending_insight_flow) ── */
function SpendingCard() {
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Donut
          segments={spendCategories.map((c) => ({ pct: c.pct, color: c.color }))}
          cLabel="Tháng này"
          cValue={`${(spendTotal / 1_000_000).toFixed(1)}tr`}
          size={104}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          {spendCategories.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{vnd(c.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Nhóm 2: thẻ dự báo dòng tiền + cảnh báo "cháy túi" (cashflow_forecast_flow) ── */
function ForecastCard() {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
        <div>
          <div className="muted tiny">Số dư hiện tại</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{vnd(forecast.current)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted tiny">Cuối tháng</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--red)" }}>{vnd(forecast.endBalance)}</div>
        </div>
      </div>
      <Sparkline points={forecast.curve} height={84} />
      <div className={`callout${forecast.alertLevel === "warn" ? " warn" : " tip"}`} style={{ marginTop: 10 }}>
        <span className="ci"><Icon.alert size={16} /></span>
        <span><b>Cảnh báo cháy túi:</b> dòng tiền dự báo xuống thấp nếu giữ nguyên xu hướng chi tiêu.</span>
      </div>
    </div>
  );
}

/* ── Nhóm 2: thẻ cảnh báo gian lận + hành động (fraud_alert_flow) ── */
function FraudCard({ active, onSafe, onLock }: { active: boolean; onSafe: () => void; onLock: () => void }) {
  return (
    <div className="card">
      <div className="kv"><span className="kv-k"><Icon.store size={14} style={{ color: "var(--g600)" }} /> Giao dịch</span><span className="kv-v">{fraudAlert.merchant}</span></div>
      <div className="kv"><span className="kv-k"><Icon.wallet size={14} style={{ color: "var(--g600)" }} /> Số tiền</span><span className="kv-v" style={{ color: "var(--red)", fontSize: 16, fontWeight: 800 }}>{vnd(fraudAlert.amount)}</span></div>
      <div className="kv"><span className="kv-k"><Icon.clock size={14} style={{ color: "var(--g600)" }} /> Thời gian</span><span className="kv-v">{fraudAlert.time}</span></div>
      <div className="kv"><span className="kv-k"><Icon.pin size={14} style={{ color: "var(--g600)" }} /> Địa điểm</span><span className="kv-v">{fraudAlert.place}</span></div>
      <div className="kv"><span className="kv-k"><Icon.card size={14} style={{ color: "var(--g600)" }} /> Hình thức</span><span className="kv-v">{fraudAlert.device}</span></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {fraudAlert.risks.map((r) => (
          <span key={r} className="pill orange"><Icon.alert size={11} /> {r}</span>
        ))}
      </div>
      {active ? (
        <div className="chat-card-actions" style={{ flexDirection: "column" }}>
          <button className="btn btn-danger" onClick={onLock}><Icon.lock size={16} /> Không phải tôi — khoá thẻ ngay</button>
          <button className="btn btn-ghost" onClick={onSafe}><Icon.checkCircle size={17} /> Đúng là giao dịch của tôi</button>
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã xử lý</div>
      )}
    </div>
  );
}

/* ── Nhóm 2: thẻ đã khoá thẻ thành công (sau khi quét mặt) ── */
function LockDoneCard() {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
        <Icon.lock size={32} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Đã khoá thẻ</div>
      <div className="muted tiny" style={{ marginTop: 4 }}>Thẻ của bạn đã được tạm khoá sau khi xác thực khuôn mặt. Mọi giao dịch mới bị chặn cho tới khi bạn mở lại.</div>
    </div>
  );
}

/* ── Nhóm 2: thẻ xác nhận mục tiêu (savings_goal_flow) ── */
function GoalConfirmCard({ plan, active, onConfirm, onCancel }: { plan: GoalPlan; active: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="card">
      <div className="kv"><span className="kv-k"><Icon.target size={13} /> Mục tiêu</span><span className="kv-v">{plan.name}</span></div>
      <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Số tiền mục tiêu</span><span className="kv-v" style={{ fontWeight: 800, fontSize: 16 }}>{vnd(plan.target)}</span></div>
      <div className="kv"><span className="kv-k"><Icon.transfer size={13} /> Gửi góp tự động</span><span className="kv-v">{vnd(plan.auto)}/tháng</span></div>
      <div className="kv"><span className="kv-k"><Icon.clock size={13} /> Thời gian dự kiến</span><span className="kv-v">~{plan.months} tháng</span></div>
      {active ? (
        <div className="chat-card-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Huỷ</button>
          <button className="btn btn-primary" onClick={onConfirm}><Icon.checkCircle size={17} /> Tạo mục tiêu</button>
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã xử lý</div>
      )}
    </div>
  );
}

/* ── Nhóm 2: thẻ mục tiêu đã lập + gamification ── */
function GoalDoneCard({ plan }: { plan: GoalPlan }) {
  const firstPct = Math.min(100, Math.round((plan.auto / plan.target) * 100));
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Ring pct={firstPct} sub="kỳ đầu" />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Đã lập mục tiêu</div>
          <div className="muted tiny" style={{ marginTop: 2 }}>{plan.name}</div>
          <div style={{ fontWeight: 800, color: "var(--g700)", marginTop: 6 }}>{vnd(plan.auto)}/tháng</div>
          <span className="pill green" style={{ marginTop: 8, display: "inline-flex" }}>
            <Icon.flame size={12} /> Bắt đầu chuỗi tiết kiệm
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Nhóm 1: thẻ số dư + lịch sử giao dịch (transaction) ──
   Lấy số dư & giao dịch THẬT từ Mock Bank Core (qua LiveData); offline → mock. */
function BalanceCard() {
  const { profile, transactions: live } = useLiveData();
  const balance = profile?.account_balance ?? user.balance;
  const rows = live
    ? live.slice(0, 4).map((t) => {
        const [y, m, d] = t.date.split("-");
        return { id: t.id, label: t.desc, date: d ? `${d}/${m}/${y}` : t.date, amount: t.amount };
      })
    : transactions.slice(0, 4).map((t) => ({ id: t.id, label: t.merchant, date: t.date, amount: t.amount }));
  return (
    <div className="card">
      <div className="muted tiny">Số dư khả dụng</div>
      <div style={{ fontWeight: 900, fontSize: 24, color: "var(--g700)" }}>{vnd(balance)}</div>
      <div className="muted tiny" style={{ margin: "12px 0 2px" }}>Giao dịch gần đây</div>
      {rows.map((t) => (
        <div className="kv" key={t.id}>
          <span className="kv-k" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontWeight: 600 }}>{t.label}</span>
            <span className="muted" style={{ fontSize: 10.5 }}>{t.date}</span>
          </span>
          <span className="kv-v" style={{ fontWeight: 700, color: t.amount < 0 ? "var(--ink)" : "var(--g700)" }}>
            {t.amount < 0 ? "" : "+"}{vnd(t.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Nhóm 1: thẻ xác nhận thao tác bảo mật (card_lock / service_lock) ── */
function SecureConfirmCard({ op, active, onConfirm, onCancel }: { op: SecureOp; active: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="card">
      {op.rows.map((row) => (
        <div className="kv" key={row.label}>
          <span className="kv-k">{row.label}</span>
          <span className="kv-v">{row.value}</span>
        </div>
      ))}
      {active ? (
        <div className="chat-card-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Huỷ</button>
          <button className="btn btn-danger" onClick={onConfirm}><Icon.lock size={16} /> {op.cta}</button>
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã xử lý</div>
      )}
    </div>
  );
}

/* ── Nhóm 1: thẻ thao tác bảo mật hoàn tất ── */
function SecureDoneCard({ op }: { op: SecureOp }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
        <Icon.lock size={32} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{op.doneTitle}</div>
      <div className="muted tiny" style={{ marginTop: 4 }}>{op.doneSub}</div>
    </div>
  );
}

/* ── Nhóm 1: phiếu hỗ trợ (card_swallowed / callback / tổng đài) ── */
function TicketCard({ t }: { t: Ticket }) {
  const I = Icon[t.icon];
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center" }}>
          <I size={19} />
        </span>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{t.title}</div>
      </div>
      {t.rows.map((row) => (
        <div className="kv" key={row.label}>
          <span className="kv-k">{row.label}</span>
          <span className="kv-v">{row.value}</span>
        </div>
      ))}
      <div className="muted tiny" style={{ marginTop: 8 }}>{t.note}</div>
    </div>
  );
}

/* ── Nhóm 1: thẻ xác nhận đổi/tạo mã PIN (bước 4) ──
   Người dùng kiểm tra lại thông tin → CHỌN phương thức xác thực → Xác nhận. */
const PIN_AUTH_METHODS = ["Smart OTP", "SMS OTP"] as const;
function PinConfirmCard({ info, active, onConfirm, onCancel }: { info: PinInfo; active: boolean; onConfirm: (method: string) => void; onCancel: () => void }) {
  const [method, setMethod] = useState<string>("SMS OTP");
  return (
    <div className="card">
      <div className="kv"><span className="kv-k">Loại thẻ</span><span className="kv-v">{info.cardType}</span></div>
      <div className="kv"><span className="kv-k">Số thẻ</span><span className="kv-v">{info.cardNo}</span></div>
      <div className="kv"><span className="kv-k">Thương hiệu thẻ</span><span className="kv-v">{info.brand}</span></div>
      <div className="kv"><span className="kv-k">Yêu cầu</span><span className="kv-v">Tạo mới/Đổi mã PIN</span></div>
      {active ? (
        <>
          <div className="muted tiny" style={{ margin: "12px 0 6px" }}>Chọn phương thức xác thực</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PIN_AUTH_METHODS.map((m) => {
              const on = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: `1.5px solid ${on ? "var(--g600)" : "var(--line, #e2e8e4)"}`,
                    background: on ? "var(--g100)" : "#fff",
                    fontWeight: on ? 700 : 500, fontSize: 13.5,
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${on ? "var(--g600)" : "#cbd5d0"}`,
                    display: "grid", placeItems: "center",
                  }}>
                    {on && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--g600)" }} />}
                  </span>
                  {m}
                </button>
              );
            })}
          </div>
          <div className="chat-card-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={onCancel}>Huỷ</button>
            <button className="btn btn-primary" onClick={() => onConfirm(method)}><Icon.checkCircle size={17} /> Xác nhận</button>
          </div>
        </>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã xử lý</div>
      )}
    </div>
  );
}

/* ── Nhóm 1: thẻ đổi/tạo mã PIN thành công (bước 5) ── */
function PinSuccessCard({ info, txn }: { info: PinInfo; txn: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
        <Icon.checkCircle size={36} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 17 }}>Đã tạo mới/đổi mã PIN thành công</div>
      <div className="card" style={{ textAlign: "left", marginTop: 12 }}>
        <div className="kv"><span className="kv-k">Loại thẻ</span><span className="kv-v">{info.cardType}</span></div>
        <div className="kv"><span className="kv-k">Số thẻ</span><span className="kv-v">{info.cardNo}</span></div>
        <div className="kv"><span className="kv-k">Thương hiệu thẻ</span><span className="kv-v">{info.brand}</span></div>
        <div className="kv"><span className="kv-k">Mã giao dịch</span><span className="kv-v">{txn}</span></div>
      </div>
    </div>
  );
}

/* ── An tâm Gia đình: trạng thái liên kết ── */
const FAM_STATUS: Record<FamilyStatus, { label: string; pill: string; icon: keyof typeof Icon }> = {
  active: { label: "Đã kích hoạt", pill: "green", icon: "checkCircle" },
  pending: { label: "Chờ xác nhận", pill: "orange", icon: "clock" },
  revoked: { label: "Đã thu hồi", pill: "red", icon: "close" },
};
const FAM_ALERT_STYLE = {
  result: { icon: "checkCircle" as const, color: "var(--g600)", bg: "var(--g100)" },
  fraud: { icon: "shield" as const, color: "#d97706", bg: "#fff2dc" },
  summary: { icon: "wallet" as const, color: "#2f80ed", bg: "#e8f1fd" },
};

/* ── Thẻ tổng quan người thân được liên kết ── */
function FamilyOverviewCard() {
  return (
    <div className="card" style={{ padding: "4px 14px" }}>
      {familyMembers.map((m) => {
        const s = FAM_STATUS[m.status];
        const S = Icon[s.icon];
        return (
          <div key={m.id} className="kv" style={{ alignItems: "center" }}>
            <span className="kv-k" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--g050, #eef5f0)", color: "var(--g700)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon.user size={16} />
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{m.relation} · {m.name}</span>
                <span className="muted" style={{ fontSize: 10.5 }}>••••{m.phone4}{m.consent ? ` · ${m.consent}` : " · Đang chờ eKYC"}</span>
              </span>
            </span>
            <span className={`pill ${s.pill}`}><S size={11} /> {s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Thẻ xác nhận liên kết — giải thích "nguyên tắc một trục" (BR-FAM-01/02) ── */
function FamilyLinkConfirmCard({ link, active, onSend, onCancel }: { link: FamilyLink; active: boolean; onSend: () => void; onCancel: () => void }) {
  return (
    <div className="card">
      <div className="kv"><span className="kv-k">Người thân</span><span className="kv-v">{link.relation}</span></div>
      <div className="kv"><span className="kv-k">Số điện thoại</span><span className="kv-v">••••{link.phone4}</span></div>
      <div className="kv"><span className="kv-k">Quyền của bạn</span><span className="kv-v">Chỉ nhận cảnh báo</span></div>
      <div className="kv"><span className="kv-k">Người thân xác nhận</span><span className="kv-v">Giọng nói + eKYC</span></div>
      <div className="callout tip" style={{ marginTop: 10 }}>
        <span className="ci"><Icon.shield size={16} /></span>
        <span><b>Nguyên tắc một trục:</b> bạn chỉ nhận cảnh báo & kết quả, không bao giờ thao tác được tiền của {link.relation}. {link.relation} có thể thu hồi liên kết bất cứ lúc nào.</span>
      </div>
      {active ? (
        <div className="chat-card-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Huỷ</button>
          <button className="btn btn-primary" onClick={onSend}><Icon.send size={16} /> Gửi yêu cầu</button>
        </div>
      ) : (
        <div className="muted tiny" style={{ marginTop: 10, textAlign: "center" }}>Đã gửi</div>
      )}
    </div>
  );
}

/* ── Thẻ chờ người thân đồng ý (giọng nói + eKYC trên máy của họ) ── */
function FamilyPendingCard({ link }: { link: FamilyLink }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: "#fff2dc", color: "#d97706", display: "grid", placeItems: "center" }}>
          <Icon.clock size={19} />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Đang chờ {link.relation} đồng ý</div>
          <div className="muted tiny">{link.relation} cần xác nhận bằng giọng nói + eKYC trên máy của họ</div>
        </div>
      </div>
    </div>
  );
}

/* ── Thẻ liên kết đã kích hoạt ── */
function FamilyActiveCard({ link }: { link: FamilyLink }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--g100)", color: "var(--g700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
        <Icon.checkCircle size={36} />
      </span>
      <div style={{ fontWeight: 900, fontSize: 17 }}>Đã kích hoạt liên kết</div>
      <div className="muted tiny" style={{ marginTop: 4 }}>Bạn và {link.relation} (••••{link.phone4}) đã liên kết. Mọi cảnh báo & kết quả từ {link.relation} sẽ tự đẩy về cho bạn real-time.</div>
    </div>
  );
}

/* ── Thẻ cảnh báo & kết quả gia đình (family_alert / parent_action_result) ── */
function FamilyAlertsCard() {
  return (
    <div className="card" style={{ padding: "4px 14px" }}>
      {familyAlerts.map((a) => {
        const st = FAM_ALERT_STYLE[a.kind];
        const I = Icon[st.icon];
        return (
          <div key={a.id} className="lrow" style={{ alignItems: "flex-start" }}>
            <span className="lrow-ico" style={{ background: st.bg, color: st.color }}>
              <I size={18} />
            </span>
            <div className="lrow-main">
              <div className="lrow-sub" style={{ whiteSpace: "normal", color: "var(--ink)", fontWeight: 600, fontSize: 12.5 }}>{a.text}</div>
              <div className="lrow-sub" style={{ marginTop: 3 }}>{a.who} · {a.time}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Thẻ tóm tắt chi tiêu người thân (chỉ-đọc — BR-FAM-05) ── */
function FamilySummaryCard() {
  return (
    <div className="card">
      <div className="kv"><span className="kv-k"><Icon.user size={13} /> Người thân</span><span className="kv-v">Mẹ · Trần Thị Hoa</span></div>
      <div className="kv"><span className="kv-k"><Icon.wallet size={13} /> Tổng chi tháng này</span><span className="kv-v" style={{ fontWeight: 800, fontSize: 16 }}>3.200.000đ</span></div>
      <div className="kv"><span className="kv-k">Nhóm chi nhiều nhất</span><span className="kv-v">Hoá đơn & thuốc men</span></div>
      <div className="kv"><span className="kv-k">Bất thường</span><span className="kv-v" style={{ color: "var(--g700)" }}>Không có</span></div>
      <div className="muted tiny" style={{ marginTop: 8 }}>Theo quyền riêng tư, bạn chỉ thấy tổng quan — không thấy số dư hay PIN/OTP của Mẹ.</div>
    </div>
  );
}

function getReply(q: string): string {
  const lq = q.toLowerCase();
  if (lq.includes("số dư")) return `Số dư hiện tại của bạn là ${vnd(user.balance)}.`;
  return 'Tôi có thể giúp bạn chuyển tiền, mở tiết kiệm, thanh toán hoá đơn, tra số dư/lịch sử, khoá thẻ/dịch vụ, báo ATM nuốt thẻ, đặt lịch gọi lại, gặp tổng đài viên, xem chi tiêu, dự báo dòng tiền hoặc đặt mục tiêu. Ví dụ hãy nói "Tôi muốn chuyển tiền".';
}
