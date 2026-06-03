import type { CartLineView } from "@/lib/cart/types";
import type { CartSnapshotItem } from "@/lib/analytics/cart-abandonment";

export function cartLinesToSnapshot(items: CartLineView[]): CartSnapshotItem[] {
  return items.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    qty: line.qty,
    title: line.title,
    slug: line.slug,
  }));
}
