import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";

export async function GET() {
  const site = await getDefaultSite();
  const session = await getCartSession();
  const customerId = await getCartCustomerId();
  const cart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    customerId,
  );
  return NextResponse.json({ cart });
}
