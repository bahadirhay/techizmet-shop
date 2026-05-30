import { NextResponse } from "next/server";
import { toPublicOrderView } from "@/lib/orders/public-order";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const body = (await req.json()) as { orderNumber?: string; email?: string };
  const orderNumber = String(body.orderNumber ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!orderNumber || !email) {
    return NextResponse.json({ error: "Sipariş numarası ve e-posta gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const order = await prisma.storeOrder.findFirst({
    where: {
      siteId: site.id,
      orderNumber: { equals: orderNumber, mode: "insensitive" },
      customerEmail: { equals: email, mode: "insensitive" },
    },
    include: { lines: true, carrier: true },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Sipariş bulunamadı. Numara ve e-postayı kontrol edin." },
      { status: 404 },
    );
  }

  return NextResponse.json({ order: toPublicOrderView(order) });
}
