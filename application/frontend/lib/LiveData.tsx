"use client";
// Lớp dữ liệu "sống" từ Mock Bank Core (Phase 6). Tải hồ sơ khách hàng (số dư,
// trạng thái thẻ) khi mở app; nếu backend offline → connected=false, UI tự fallback
// về mock. refresh() được gọi sau mỗi thao tác ghi (vd chuyển tiền) để số dư cập nhật.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { bankApi, type Profile, type BankTxn } from "./api";

interface LiveData {
  profile: Profile | null;       // null = chưa nối được backend (dùng mock)
  transactions: BankTxn[] | null; // null = chưa nối được (dùng mock)
  connected: boolean;            // đã lấy được dữ liệu từ mockapi?
  refresh: () => void;
}

const Ctx = createContext<LiveData>({ profile: null, transactions: null, connected: false, refresh: () => {} });

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<BankTxn[] | null>(null);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(() => {
    Promise.all([bankApi.getProfile(), bankApi.getTransactions()])
      .then(([p, txns]) => { setProfile(p); setTransactions(txns); setConnected(true); })
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <Ctx.Provider value={{ profile, transactions, connected, refresh }}>{children}</Ctx.Provider>;
}

export const useLiveData = () => useContext(Ctx);
