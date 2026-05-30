export const FINANCE_TX_KINDS = [
  { id: "sale_income", label: "Satış geliri", sign: 1 as const },
  { id: "other_income", label: "Diğer gelir", sign: 1 as const },
  { id: "expense", label: "Gider", sign: -1 as const },
  { id: "payment_in", label: "Tahsilat", sign: 1 as const },
  { id: "payment_out", label: "Ödeme", sign: -1 as const },
  { id: "marketplace_deduction", label: "Pazaryeri kesinti faturası", sign: -1 as const },
  { id: "marketplace_payout", label: "Pazaryeri hakediş ödemesi", sign: 1 as const },
] as const;

export type FinanceTxKind = (typeof FINANCE_TX_KINDS)[number]["id"];

export const FINANCE_ACCOUNT_KINDS = [
  { id: "cash", label: "Kasa / nakit" },
  { id: "bank", label: "Banka" },
  { id: "credit_card", label: "Kredi kartı" },
  { id: "marketplace_receivable", label: "Pazaryeri alacağı" },
] as const;

export function financeKindLabel(kind: string): string {
  return FINANCE_TX_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function financeKindSign(kind: string): number {
  return FINANCE_TX_KINDS.find((k) => k.id === kind)?.sign ?? 0;
}

export function signedAmountMinor(kind: string, amountMinor: number): number {
  return amountMinor * financeKindSign(kind);
}
