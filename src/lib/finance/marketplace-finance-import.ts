import "server-only";

import { importAmazonFinance } from "@/lib/finance/amazon-finance-import";
import { importHepsiburadaFinance } from "@/lib/finance/hepsiburada-finance-import";
import type { MarketplaceFinanceImportResult } from "@/lib/finance/marketplace-finance-types";
import { importTrendyolFinance } from "@/lib/finance/trendyol-finance-import";

const FINANCE_IMPORT_PLATFORMS = ["trendyol", "hepsiburada", "amazon_tr"] as const;

export type FinanceImportPlatform = (typeof FINANCE_IMPORT_PLATFORMS)[number];

export function isFinanceImportPlatform(platform: string): platform is FinanceImportPlatform {
  return FINANCE_IMPORT_PLATFORMS.includes(platform as FinanceImportPlatform);
}

export async function importMarketplaceFinance(
  siteId: string,
  platform: FinanceImportPlatform,
  options: { sinceDays?: number } = {},
): Promise<MarketplaceFinanceImportResult> {
  switch (platform) {
    case "trendyol": {
      const result = await importTrendyolFinance(siteId, options);
      return { platform: "trendyol", ...result };
    }
    case "hepsiburada":
      return importHepsiburadaFinance(siteId, options);
    case "amazon_tr":
      return importAmazonFinance(siteId, options);
    default:
      return {
        platform,
        payouts: { created: 0, skipped: 0 },
        deductions: { created: 0, skipped: 0, linked: 0 },
        ordersTagged: 0,
        errors: [`${platform} finans içe aktarma desteklenmiyor`],
        message: "Desteklenmeyen platform",
      };
  }
}

export async function importAllMarketplaceFinance(
  siteId: string,
  platforms: FinanceImportPlatform[],
  options: { sinceDays?: number } = {},
): Promise<MarketplaceFinanceImportResult[]> {
  const results: MarketplaceFinanceImportResult[] = [];
  for (const platform of platforms) {
    results.push(await importMarketplaceFinance(siteId, platform, options));
  }
  return results;
}
