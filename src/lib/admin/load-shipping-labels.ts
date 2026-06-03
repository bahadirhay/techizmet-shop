import "server-only";

import {
  defaultShipFrom,
  toShippingLabelData,
  type ShipFromAddress,
  type ShippingLabelData,
} from "@/lib/admin/shipping-label";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function shipFromFromSettings(settingsJson: string | null, storeName: string): ShipFromAddress {
  const settings = parseSiteSettings(settingsJson);
  const saved = settings.store?.shipFrom;
  const base = defaultShipFrom(storeName);
  if (!saved) return base;
  return {
    name: saved.name?.trim() || base.name,
    line1: saved.line1?.trim() ?? "",
    line2: saved.line2?.trim(),
    district: saved.district?.trim() ?? "",
    city: saved.city?.trim() ?? "",
    postalCode: saved.postalCode?.trim() ?? "",
    phone: saved.phone?.trim() ?? "",
  };
}

export async function loadShippingLabelsForPrint(
  siteId: string,
  orderIds: string[],
): Promise<{ labels: ShippingLabelData[]; shipFrom: ShipFromAddress; storeName: string } | null> {
  if (!orderIds.length) return null;

  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { name: true, settingsJson: true },
  });
  if (!site) return null;

  const orders = await prisma.storeOrder.findMany({
    where: { siteId, id: { in: orderIds } },
    include: {
      carrier: { select: { name: true } },
      lines: { select: { title: true, qty: true } },
    },
  });

  const byId = new Map(orders.map((o) => [o.id, o]));
  const labels = orderIds
    .map((id) => byId.get(id))
    .filter((o): o is NonNullable<typeof o> => o != null)
    .map((o) => toShippingLabelData(o));

  return {
    labels,
    shipFrom: shipFromFromSettings(site.settingsJson, site.name),
    storeName: site.name,
  };
}

export async function loadOrdersForLabelPicker(siteId: string, status?: string) {
  return prisma.storeOrder.findMany({
    where: {
      siteId,
      status: status
        ? status === "active"
          ? { in: ["pending", "confirmed", "preparing"] }
          : status
        : { notIn: ["cancelled", "refunded"] },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      marketplacePlatform: true,
      createdAt: true,
      trackingNumber: true,
      carrier: { select: { name: true } },
    },
  });
}
