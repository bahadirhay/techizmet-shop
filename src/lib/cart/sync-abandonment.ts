import "server-only";

import type { CartView } from "@/lib/cart/types";
import { cartLinesToSnapshot } from "@/lib/analytics/cart-snapshot";
import { upsertCartAbandonment } from "@/lib/analytics/cart-abandonment";

/** Sepet API değişikliklerinden sonra terk kaydını güncelle */
export async function syncCartAbandonmentFromView(params: {
  siteId: string;
  visitorKey: string | null | undefined;
  customerId?: string | null;
  cart: CartView;
  stage?: "cart" | "checkout";
}): Promise<void> {
  if (!params.visitorKey?.trim()) return;
  if (!params.cart.items.length) return;

  await upsertCartAbandonment({
    siteId: params.siteId,
    visitorKey: params.visitorKey.trim(),
    customerId: params.customerId,
    items: cartLinesToSnapshot(params.cart.items),
    cartValueMinor: params.cart.subtotalMinor,
    stage: params.stage ?? "cart",
  });
}
