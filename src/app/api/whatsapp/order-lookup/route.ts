import { NextResponse } from "next/server";
import { formatBotOrderReply } from "@/lib/whatsapp/order-lookup-reply";
import { toPublicOrderView } from "@/lib/orders/public-order";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`wa-order-lookup:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json().catch(() => ({}))) as {
    orderNumber?: string;
    email?: string;
  };

  const orderNumber = String(body.orderNumber ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!orderNumber || !email) {
    return NextResponse.json(
      { error: "Sipariş numarası ve e-posta gerekli." },
      { status: 400 },
    );
  }

  if (!email.includes("@")) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi girin." },
      { status: 400 },
    );
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
      {
        error:
          "Sipariş bulunamadı. Numara ve e-postanın checkout sırasında kullandığınız bilgilerle aynı olduğundan emin olun.",
      },
      { status: 404 },
    );
  }

  const view = toPublicOrderView(order);
  return NextResponse.json({
    order: view,
    summary: formatBotOrderReply(view),
  });
}
