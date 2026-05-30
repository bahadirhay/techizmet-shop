import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView, getShippingOptions } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const site = await getDefaultSite();
  const session = await getCartSession();
  const cart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    await getCartCustomerId(),
  );
  if (cart.items.length === 0) {
    return NextResponse.json({ options: [], cart });
  }

  const products = await prisma.storeProduct.findMany({
    where: { id: { in: cart.items.map((i) => i.productId) } },
    select: { desi: true },
  });
  const totalDesi = Math.max(1, products.reduce((s, p) => s + (p.desi ?? 1), 0));

  const options = await getShippingOptions(
    site.id,
    cart.totalMinor,
    cart.freeShipping,
    totalDesi,
  );

  return NextResponse.json({
    options,
    cart,
    freeShipping: cart.freeShipping,
  });
}
