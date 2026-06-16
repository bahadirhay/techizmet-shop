/**
 * Yerel doğrulama: wholesale kolonu + pricing-calculator
 */
import { PrismaClient } from "@prisma/client";
import {
  buildChannelEconomicsRow,
  computeMarketplaceNetPayout,
} from "../src/lib/marketplace/pricing-calculator";

const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'shop' AND table_name = 'product' AND column_name = 'wholesalePriceMinor'
  `;
  console.log("[db] wholesalePriceMinor column:", cols.length ? "OK" : "MISSING");

  const payout = computeMarketplaceNetPayout(74900, {
    commissionPercent: 18,
    extraCommissionPercent: 0,
    shippingModel: "marketplace_cargo",
    shippingFeeMinor: 4500,
  });
  console.log("[calc] net payout 749 TL @18%:", payout.netPayoutMinor / 100);

  const row = buildChannelEconomicsRow({
    platform: "trendyol",
    platformLabel: "Trendyol",
    webPriceMinor: 59900,
    marketplaceOverrideMinor: 74900,
    costMinor: 28000,
    wholesaleMinor: 45000,
    rule: {
      id: null,
      commissionPercent: 18,
      extraCommissionPercent: 0,
      shippingModel: "marketplace_cargo",
      shippingFeeMinor: 4500,
      source: "fallback",
    },
  });
  console.log("[calc] margin on cost:", row.marginOnCostPercent);
  console.log("[calc] suggested:", row.suggestedMinor ? row.suggestedMinor / 100 : null);

  const product = await prisma.storeProduct.findFirst({
    select: { id: true, title: true, wholesalePriceMinor: true },
    orderBy: { updatedAt: "desc" },
  });
  console.log("[db] sample product:", product?.title, "wholesale:", product?.wholesalePriceMinor);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
