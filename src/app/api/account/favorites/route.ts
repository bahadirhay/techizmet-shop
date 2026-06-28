import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

async function requireCustomer() {
  const site = await getDefaultSite();
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId || session.siteId !== site.id) {
    return { error: NextResponse.json({ error: "Giriş gerekli" }, { status: 401 }), site, customerId: null };
  }
  return { error: null, site, customerId: session.customerId };
}

export async function GET() {
  const auth = await requireCustomer();
  if (auth.error) {
    // Giriş yapmamış kullanıcılar için boş liste döndür — 401 yerine 200
    return NextResponse.json({ productIds: [], slugs: [] });
  }

  const rows = await prisma.customerFavorite.findMany({
    where: { customerId: auth.customerId! },
    select: { productId: true, product: { select: { slug: true } } },
  });
  return NextResponse.json({
    productIds: rows.map((r) => r.productId),
    slugs: rows.map((r) => r.product.slug),
  });
}

export async function POST(req: Request) {
  const auth = await requireCustomer();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { productId?: string; slug?: string };
  let productId = body.productId?.trim();
  let productSlug: string | undefined;

  if (!productId && body.slug?.trim()) {
    const bySlug = await prisma.storeProduct.findFirst({
      where: { slug: body.slug.trim(), siteId: auth.site.id, published: true },
      select: { id: true, slug: true },
    });
    if (!bySlug) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }
    productId = bySlug.id;
    productSlug = bySlug.slug;
  }

  if (!productId) {
    return NextResponse.json({ error: "productId veya slug gerekli" }, { status: 400 });
  }

  const product =
    productSlug !== undefined
      ? { id: productId, slug: productSlug }
      : await prisma.storeProduct.findFirst({
          where: { id: productId, siteId: auth.site.id, published: true },
          select: { id: true, slug: true },
        });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const existing = await prisma.customerFavorite.findUnique({
    where: { customerId_productId: { customerId: auth.customerId!, productId } },
  });

  if (existing) {
    await prisma.customerFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false, productId: product.id, slug: product.slug });
  }

  await prisma.customerFavorite.create({
    data: { customerId: auth.customerId!, productId: product.id },
  });
  return NextResponse.json({ favorited: true, productId: product.id, slug: product.slug });
}
