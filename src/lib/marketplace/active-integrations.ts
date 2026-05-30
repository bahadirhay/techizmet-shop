import "server-only";

import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { prisma } from "@/lib/prisma";

export type { ActiveMarketplaceOption };

/** Aktif pazaryeri entegrasyonları — ürün formunda kanal fiyatı alanları için. */
export async function loadActiveMarketplacePlatforms(siteId: string): Promise<ActiveMarketplaceOption[]> {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { siteId, active: true },
    select: { platform: true },
    orderBy: { platform: "asc" },
  });

  return integrations.map((i) => {
    const meta = MARKETPLACE_PLATFORMS.find((p) => p.id === i.platform);
    return { id: i.platform, label: meta?.label ?? i.platform };
  });
}
