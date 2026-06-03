import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { resolveAddToCartInput } from "@/lib/cart/resolve-add-to-cart";
import { addToCart, buildCartView } from "@/lib/cart/service";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
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
  const resolved = await resolveAddToCartInput(site.id, body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { productId, variantId, qty } = resolved.data;
  const session = await getCartSession();
  const next = await addToCart(
    { items: session.items, couponCode: session.couponCode },
    productId,
    qty,
    variantId,
  );
  await saveCartSession(next);
  const cart = await buildCartView(next, site.id, await getCartCustomerId());
  return NextResponse.json({ cart, ok: true });
}
