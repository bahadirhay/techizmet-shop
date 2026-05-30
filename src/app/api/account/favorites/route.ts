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
  if (auth.error) return auth.error;

  const rows = await prisma.customerFavorite.findMany({
    where: { customerId: auth.customerId! },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: rows.map((r) => r.productId) });
}

export async function POST(req: Request) {
  const auth = await requireCustomer();
  if (auth.error) return auth.error;

  const body = (await req.json()) as { productId?: string };
  const productId = body.productId?.trim();
  if (!productId) {
    return NextResponse.json({ error: "productId gerekli" }, { status: 400 });
  }

  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId: auth.site.id, published: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const existing = await prisma.customerFavorite.findUnique({
    where: { customerId_productId: { customerId: auth.customerId!, productId } },
  });

  if (existing) {
    await prisma.customerFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.customerFavorite.create({
    data: { customerId: auth.customerId!, productId },
  });
  return NextResponse.json({ favorited: true });
}
