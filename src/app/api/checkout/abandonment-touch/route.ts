import { NextResponse } from "next/server";
import { cartLinesToSnapshot } from "@/lib/analytics/cart-snapshot";
import { touchCartAbandonmentCheckout } from "@/lib/analytics/cart-abandonment";
import { readVisitorKey } from "@/lib/analytics/visitor";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";

/** Checkout sayfasında e-posta/telefon girildiğinde sepet terk kaydını günceller */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    phone?: string;
  };

  const site = await getDefaultSite();
  const visitorKey = await readVisitorKey();
  if (!visitorKey) {
    return NextResponse.json({ ok: false, reason: "no_visitor" });
  }

  const session = await getCartSession();
  const customerId = await getCartCustomerId();
  const cart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    customerId,
  );

  await touchCartAbandonmentCheckout({
    siteId: site.id,
    visitorKey,
    customerId,
    guestEmail: body.email ?? null,
    guestPhone: body.phone ?? null,
    items: cart.items.length ? cartLinesToSnapshot(cart.items) : undefined,
    cartValueMinor: cart.subtotalMinor,
  });

  return NextResponse.json({ ok: true });
}
