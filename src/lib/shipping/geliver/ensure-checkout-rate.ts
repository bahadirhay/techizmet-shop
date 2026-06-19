import "server-only";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { geliverReady } from "@/lib/shipping/geliver/settings";

const GELIVER_CARRIER_CODE = "geliver";

/** Geliver açıkken ödeme sayfasında en az bir kargo tarifesi olsun */
export async function ensureGeliverCheckoutRate(siteId: string): Promise<void> {
  const settings = await getSiteSettings(siteId);
  if (!geliverReady(settings)) return;

  let carrier = await prisma.shippingCarrier.findFirst({
    where: { siteId, code: GELIVER_CARRIER_CODE },
    include: { rates: { where: { active: true } } },
  });

  if (!carrier) {
    carrier = await prisma.shippingCarrier.create({
      data: {
        siteId,
        code: GELIVER_CARRIER_CODE,
        name: "Geliver Kargo",
        active: true,
        trackingUrlTemplate: "https://app.geliver.io/tracking/{tracking}",
        notes: "Geliver entegrasyonu — tarife ödeme sayfası için",
        sortOrder: 0,
      },
      include: { rates: { where: { active: true } } },
    });
  } else if (!carrier.active) {
    await prisma.shippingCarrier.update({ where: { id: carrier.id }, data: { active: true } });
  }

  if (carrier.rates.length > 0) return;

  const priceMinor = settings.finance?.webShippingCostMinor ?? 9900;
  await prisma.shippingRate.create({
    data: {
      carrierId: carrier.id,
      name: "Standart kargo",
      priceMinor: Math.max(0, priceMinor),
      active: true,
      sortOrder: 0,
    },
  });
}
