// Screen routing within the mobile shell. Each value is a "card"/flow from §13.
export type Screen =
  | "home"
  | "assistant"
  | "history"
  | "bills"
  | "fraud"
  | "savings"
  | "support"
  | "goal"
  | "forecast"
  | "transfer"
  | "accessibility";

export interface Txn {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number; // int VND, negative = outflow (BR: int VND, no float)
  icon: string; // short badge label
  color: string;
}

export interface Bill {
  id: string;
  name: string;
  provider: string;
  due: string;
  amount: number;
  status: "today" | "soon" | "upcoming";
  icon: keyof typeof import("../components/Icon").Icon;
  color: string;
}

export interface CategorySpend {
  name: string;
  amount: number;
  pct: number;
  color: string;
}
