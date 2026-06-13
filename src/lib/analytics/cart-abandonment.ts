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
  stage?: "cart" | "checkout";
  guestEmail?: string | null;
  guestPhone?: string | null;
}): Promise<void> {
  if (!params.items.length) return;

  const itemsJson = JSON.stringify(params.items);
  const itemCount = params.items.reduce((s, i) => s + i.qty, 0);
  const stage = params.stage ?? "cart";

  const existing = await prisma.cartAbandonment.findFirst({
    where: {
      siteId: params.siteId,
      visitorKey: params.visitorKey,
      status: "open",
    },
    orderBy: { lastActivityAt: "desc" },
  });

  const contactPatch = {
    ...(params.guestEmail !== undefined
      ? { guestEmail: params.guestEmail?.trim().slice(0, 320) || null }
      : {}),
    ...(params.guestPhone !== undefined
      ? { guestPhone: params.guestPhone?.trim().slice(0, 40) || null }
      : {}),
  };

  if (existing) {
    await prisma.cartAbandonment.update({
      where: { id: existing.id },
      data: {
        itemsJson,
        cartValueMinor: params.cartValueMinor,
        itemCount,
        lastActivityAt: new Date(),
        customerId: params.customerId ?? existing.customerId,
        stage: stage === "checkout" ? "checkout" : existing.stage === "checkout" ? "checkout" : stage,
        ...contactPatch,
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
      stage,
      guestEmail: params.guestEmail?.trim().slice(0, 320) || null,
      guestPhone: params.guestPhone?.trim().slice(0, 40) || null,
    },
  });
}

/** Checkout formu — e-posta/telefon girildiğinde */
export async function touchCartAbandonmentCheckout(params: {
  siteId: string;
  visitorKey: string;
  customerId?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  items?: CartSnapshotItem[];
  cartValueMinor?: number;
}): Promise<void> {
  const existing = await prisma.cartAbandonment.findFirst({
    where: {
      siteId: params.siteId,
      visitorKey: params.visitorKey,
      status: "open",
    },
    orderBy: { lastActivityAt: "desc" },
  });

  const email = params.guestEmail?.trim() || null;
  const phone = params.guestPhone?.trim() || null;
  if (!email && !phone && !existing) return;

  if (existing) {
    await prisma.cartAbandonment.update({
      where: { id: existing.id },
      data: {
        stage: "checkout",
        lastActivityAt: new Date(),
        customerId: params.customerId ?? existing.customerId,
        ...(email ? { guestEmail: email.slice(0, 320) } : {}),
        ...(phone ? { guestPhone: phone.slice(0, 40) } : {}),
        ...(params.items?.length
          ? {
              itemsJson: JSON.stringify(params.items),
              itemCount: params.items.reduce((s, i) => s + i.qty, 0),
              cartValueMinor: params.cartValueMinor ?? existing.cartValueMinor,
            }
          : {}),
      },
    });
    return;
  }

  if (!params.items?.length) return;

  await upsertCartAbandonment({
    siteId: params.siteId,
    visitorKey: params.visitorKey,
    customerId: params.customerId,
    items: params.items,
    cartValueMinor: params.cartValueMinor ?? 0,
    stage: "checkout",
    guestEmail: email,
    guestPhone: phone,
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

export async function dismissCartAbandonment(siteId: string, id: string): Promise<boolean> {
  const row = await prisma.cartAbandonment.findFirst({ where: { id, siteId, status: "open" } });
  if (!row) return false;
  await prisma.cartAbandonment.update({
    where: { id },
    data: { status: "dismissed", lastActivityAt: new Date() },
  });
  return true;
}
