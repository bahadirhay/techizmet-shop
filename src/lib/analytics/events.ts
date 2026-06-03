import "server-only";

import { prisma } from "@/lib/prisma";
import type { IncomingStoreEvent, StoreEventType, UtmAttribution } from "@/lib/analytics/types";
import { upsertCartAbandonment, type CartSnapshotItem } from "@/lib/analytics/cart-abandonment";
import { ensureVisitorProfile, linkVisitorToCustomer } from "@/lib/analytics/visitor";

const ALLOWED: StoreEventType[] = [
  "page_view",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "purchase",
];

function isAllowedType(t: string): t is StoreEventType {
  return (ALLOWED as string[]).includes(t);
}

export async function recordStoreEvents(params: {
  siteId: string;
  events: IncomingStoreEvent[];
  visitorKey?: string | null;
  customerId?: string | null;
  userAgent?: string | null;
  utm?: UtmAttribution;
}): Promise<{ visitorKey: string; recorded: number }> {
  const filtered = params.events.filter((e) => isAllowedType(e.type));
  if (!filtered.length) {
    const key = params.visitorKey ?? (await ensureVisitorProfile(params.siteId)).visitorKey;
    return { visitorKey: key, recorded: 0 };
  }

  const { visitorKey } = await ensureVisitorProfile(params.siteId, {
    visitorKey: params.visitorKey,
    customerId: params.customerId,
    userAgent: params.userAgent,
    utm: params.utm,
  });

  if (params.customerId) {
    await linkVisitorToCustomer(params.siteId, visitorKey, params.customerId);
  }

  await prisma.storeEvent.createMany({
    data: filtered.map((e) => ({
      siteId: params.siteId,
      visitorKey,
      customerId: params.customerId ?? null,
      eventType: e.type,
      payloadJson: JSON.stringify(e.payload ?? {}),
      createdAt: e.at ? new Date(e.at) : undefined,
    })),
  });

  for (const e of filtered) {
    if (e.type === "add_to_cart") {
      await handleAddToCartSideEffects(params.siteId, visitorKey, params.customerId, e.payload);
    }
    if (e.type === "purchase") {
      await handlePurchaseSideEffects(params.siteId, visitorKey, params.customerId, e.payload);
    }
  }

  return { visitorKey, recorded: filtered.length };
}

async function handleAddToCartSideEffects(
  siteId: string,
  visitorKey: string,
  customerId: string | null | undefined,
  payload: Record<string, unknown>,
) {
  if (Array.isArray(payload.cartItems)) {
    await upsertCartAbandonment({
      siteId,
      visitorKey,
      customerId,
      items: payload.cartItems as CartSnapshotItem[],
      cartValueMinor: Number(payload.cartValueMinor) || 0,
    });
    return;
  }

  const productId = String(payload.productId ?? "");
  if (!productId) return;

  const open = await prisma.cartAbandonment.findFirst({
    where: { siteId, visitorKey, status: "open" },
    orderBy: { lastActivityAt: "desc" },
  });

  let items: CartSnapshotItem[] = [];
  if (open?.itemsJson) {
    try {
      items = JSON.parse(open.itemsJson) as CartSnapshotItem[];
    } catch {
      items = [];
    }
  }

  const variantId = payload.variantId != null ? String(payload.variantId) : null;
  const qty = Math.max(1, Number(payload.qty) || 1);
  const idx = items.findIndex(
    (i) => i.productId === productId && (i.variantId ?? null) === variantId,
  );
  if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + qty };
  else {
    items.push({
      productId,
      variantId,
      qty,
      title: payload.title ? String(payload.title) : undefined,
      slug: payload.slug ? String(payload.slug) : undefined,
    });
  }

  const cartValueMinor =
    typeof payload.cartValueMinor === "number"
      ? payload.cartValueMinor
      : (open?.cartValueMinor ?? 0);

  await upsertCartAbandonment({
    siteId,
    visitorKey,
    customerId,
    items,
    cartValueMinor,
  });
}

async function handlePurchaseSideEffects(
  siteId: string,
  visitorKey: string,
  customerId: string | null | undefined,
  payload: Record<string, unknown>,
) {
  const orderId = String(payload.orderId ?? "");
  if (!orderId) return;
  const { markCartAbandonmentRecovered } = await import("@/lib/analytics/cart-abandonment");
  await markCartAbandonmentRecovered({
    siteId,
    visitorKey,
    customerId,
    orderId,
  });
}

/** Sunucu tarafı tek olay — sepet / checkout / ödeme hook'ları */
export async function recordServerStoreEvent(params: {
  siteId: string;
  type: StoreEventType;
  payload: Record<string, unknown>;
  visitorKey?: string | null;
  customerId?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await recordStoreEvents({
    siteId: params.siteId,
    visitorKey: params.visitorKey,
    customerId: params.customerId,
    userAgent: params.userAgent,
    events: [{ type: params.type, payload: params.payload }],
  });
}

/** Ödeme tamamlandı — sepet terkini kapat, mümkünse purchase olayı yaz */
export async function recordPurchaseEvent(params: {
  siteId: string;
  orderId: string;
  orderNumber: string;
  valueMinor: number;
  paymentMethod?: string;
  visitorKey?: string | null;
  customerId?: string | null;
}): Promise<void> {
  const { markCartAbandonmentRecovered } = await import("@/lib/analytics/cart-abandonment");

  let visitorKey = params.visitorKey?.trim() || null;
  if (!visitorKey && params.customerId) {
    const profile = await prisma.visitorProfile.findFirst({
      where: { siteId: params.siteId, customerId: params.customerId },
      orderBy: { lastSeenAt: "desc" },
      select: { visitorKey: true },
    });
    visitorKey = profile?.visitorKey ?? null;
  }

  await markCartAbandonmentRecovered({
    siteId: params.siteId,
    visitorKey,
    customerId: params.customerId,
    orderId: params.orderId,
  });

  if (!visitorKey) return;

  await recordStoreEvents({
    siteId: params.siteId,
    visitorKey,
    customerId: params.customerId,
    events: [
      {
        type: "purchase",
        payload: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          valueMinor: params.valueMinor,
          paymentMethod: params.paymentMethod,
        },
      },
    ],
  });
}
