import { NextResponse } from "next/server";
import { readVisitorKey } from "@/lib/analytics/visitor";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView, updateCartQty } from "@/lib/cart/service";
import { syncCartAbandonmentFromView } from "@/lib/cart/sync-abandonment";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";

async function syncAfterCartChange(cart: Awaited<ReturnType<typeof buildCartView>>) {
  const site = await getDefaultSite();
  const [visitorKey, customerId] = await Promise.all([readVisitorKey(), getCartCustomerId()]);
  await syncCartAbandonmentFromView({
    siteId: site.id,
    visitorKey,
    customerId,
    cart,
  }).catch((e) => console.error("[cart abandonment sync]", e));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const { productId } = await ctx.params;
  const body = (await req.json()) as { qty?: number; variantId?: string };
  const qty = parseInt(String(body.qty ?? 0), 10);
  const variantId = body.variantId ? String(body.variantId).trim() : null;
  const site = await getDefaultSite();
  const session = await getCartSession();
  const next = await updateCartQty(
    { items: session.items, couponCode: session.couponCode },
    productId,
    qty,
    variantId,
  );
  await saveCartSession(next);
  const cart = await buildCartView(next, site.id, await getCartCustomerId());
  await syncAfterCartChange(cart);
  return NextResponse.json({ cart });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ productId: string }> }) {
  const { productId } = await ctx.params;
  const url = new URL(req.url);
  const variantId = url.searchParams.get("variantId");
  const site = await getDefaultSite();
  const session = await getCartSession();
  const next = await updateCartQty(
    { items: session.items, couponCode: session.couponCode },
    productId,
    0,
    variantId,
  );
  await saveCartSession(next);
  const cart = await buildCartView(next, site.id, await getCartCustomerId());
  await syncAfterCartChange(cart);
  return NextResponse.json({ cart });
}
