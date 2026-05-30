export type MarketplaceFinanceImportResult = {
  platform: string;
  payouts: { created: number; skipped: number };
  deductions: { created: number; skipped: number; linked: number };
  ordersTagged: number;
  errors: string[];
  message: string;
};
