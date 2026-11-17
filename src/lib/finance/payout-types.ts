/** Client + server paylaşımı — server-only import yok */

export type PayoutBreakdownLine = {
  key: string;
  label: string;
  description?: string;
  amountMinor: number;
};

export type PayoutBatchRow = {
  id: string;
  paymentOrderId: string | null;
  payoutDate: Date;
  payoutAmountMinor: number;
  expectedNetMinor: number | null;
  orderCount: number;
  varianceMinor: number | null;
  status:
    | "ok"
    | "variance"
    | "pending_orders"
    | "manual"
    | "pending_payout"
    | "transfer_failed";
  platform: string;
  description: string;
  /** Amazon: bankaya yatmadı / bekliyor */
  transferOutcome?: "succeeded" | "processing" | "failed" | "pending" | null;
  /** Partner paneli kalemleri — farkın nedeni */
  breakdown: PayoutBreakdownLine[];
  varianceReasons: string[];
};

export type PayoutReconciliationReport = {
  batches: PayoutBatchRow[];
  totals: {
    payoutMinor: number;
    expectedMinor: number | null;
    varianceMinor: number | null;
    unlinkedOrders: number;
  };
};
