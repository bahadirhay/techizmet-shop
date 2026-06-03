import "server-only";

import { prisma } from "@/lib/prisma";

export type CartSnapshotItem = {
  productId: string;
  variantId?: string | null;
  qty: number;
  title?: string;
  slug?: string;
};

export async function upsertCartAbandonment(params: {
  siteId: string;
  visitorKey: string;
  customerId?: string | null;
  items: CartSnapshotItem[];
  cartValueMinor: number;
}): Promise<void> {
  if (!params.items.length) return;

  const itemsJson = JSON.stringify(params.items);
  const itemCount = params.items.reduce((s, i) => s + i.qty, 0);

  const existing = await prisma.cartAbandonment.findFirst({
    where: {
      siteId: params.siteId,
      visitorKey: params.visitorKey,
      status: "open",
    },
    orderBy: { lastActivityAt: "desc" },
  });

  if (existing) {
    await prisma.cartAbandonment.update({
      where: { id: existing.id },
      data: {
        itemsJson,
        cartValueMinor: params.cartValueMinor,
        itemCount,
        lastActivityAt: new Date(),
        customerId: params.customerId ?? existing.customerId,
      },
    });
    return;
  }

  await prisma.cartAbandonment.create({
    data: {
      siteId: params.siteId,
      visitorKey: params.visitorKey,
      customerId: params.customerId ?? null,
      itemsJson,
      cartValueMinor: params.cartValueMinor,
      itemCount,
      status: "open",
    },
  });
}

export async function markCartAbandonmentRecovered(params: {
  siteId: string;
  visitorKey: string | null;
  customerId?: string | null;
  orderId: string;
}): Promise<void> {
  const or: { visitorKey?: string; customerId?: string }[] = [];
  if (params.visitorKey) or.push({ visitorKey: params.visitorKey });
  if (params.customerId) or.push({ customerId: params.customerId });
  if (!or.length) return;

  await prisma.cartAbandonment.updateMany({
    where: {
      siteId: params.siteId,
      status: "open",
      OR: or,
    },
    data: {
      status: "recovered",
      convertedOrderId: params.orderId,
      lastActivityAt: new Date(),
    },
  });
}
