export type MarketplaceFinanceImportResult = {
  platform: string;
  payouts: { created: number; skipped: number };
  deductions: { created: number; skipped: number; linked: number };
  /** Settlement'tan sipariş bazında yazılan gerçek komisyon adedi (Trendyol) */
  commissionsPosted?: number;
  /** Hakediş kırılımından siparişe dağıtılan kargo/platform/stopaj adedi */
  payoutDeductionsAllocated?: number;
  ordersTagged: number;
  errors: string[];
  message: string;
};
