import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView, updateCartQty } from "@/lib/cart/service";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";

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
  return NextResponse.json({ cart });
}
