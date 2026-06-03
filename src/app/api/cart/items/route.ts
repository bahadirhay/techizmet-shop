import { NextResponse } from "next/server";
import { cartLinesToSnapshot } from "@/lib/analytics/cart-snapshot";
import { recordServerStoreEvent } from "@/lib/analytics/events";
import { readVisitorKey } from "@/lib/analytics/visitor";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { resolveAddToCartInput } from "@/lib/cart/resolve-add-to-cart";
import { addToCart, buildCartView } from "@/lib/cart/service";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    productId?: string;
    slug?: string;
    variantId?: string;
    variantLabel?: string;
    qty?: number;
  };

  const site = await getDefaultSite();
  const [resolved, session] = await Promise.all([
    resolveAddToCartInput(site.id, body),
    getCartSession(),
  ]);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { productId, variantId, qty } = resolved.data;
  const next = await addToCart(
    { items: session.items, couponCode: session.couponCode },
    productId,
    qty,
    variantId,
  );
  await saveCartSession(next);
  const customerId = await getCartCustomerId();
  const cart = await buildCartView(next, site.id, customerId);

  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId: site.id },
    select: { slug: true, title: true },
  });

  recordServerStoreEvent({
    siteId: site.id,
    type: "add_to_cart",
    payload: {
      productId,
      variantId,
      qty,
      slug: product?.slug,
      title: product?.title,
      cartItems: cartLinesToSnapshot(cart.items),
      cartValueMinor: cart.subtotalMinor,
    },
    visitorKey: await readVisitorKey(),
    customerId,
    userAgent: req.headers.get("user-agent"),
  }).catch((e) => console.error("[analytics]", e));

  return NextResponse.json({ cart, ok: true });
}
