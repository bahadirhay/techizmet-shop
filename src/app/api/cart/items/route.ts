import { NextResponse } from "next/server";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { addToCart, buildCartView } from "@/lib/cart/service";
import { getCartSession, saveCartSession } from "@/lib/cart/session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { productId?: string; variantId?: string; qty?: number };
  const productId = String(body.productId ?? "").trim();
  const variantId = body.variantId ? String(body.variantId).trim() : null;
  const qty = Math.max(1, parseInt(String(body.qty ?? 1), 10) || 1);
  if (!productId) return NextResponse.json({ error: "Ürün gerekli" }, { status: 400 });

  const site = await getDefaultSite();
  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId: site.id, published: true },
    include: { variants: true },
  });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  if (product.variants.length > 0) {
    if (!variantId) {
      return NextResponse.json({ error: "Lütfen bir seçenek seçin (ör. 30ml)" }, { status: 400 });
    }
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return NextResponse.json({ error: "Geçersiz seçenek" }, { status: 400 });
    if (variant.stockQty < 1) return NextResponse.json({ error: "Bu seçenek tükendi" }, { status: 400 });
  } else if (product.stockQty < 1) {
    return NextResponse.json({ error: "Ürün tükendi" }, { status: 400 });
  }

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
