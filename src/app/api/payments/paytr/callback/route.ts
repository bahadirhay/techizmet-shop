import { NextResponse } from "next/server";
import { sendOrderConfirmationBundle } from "@/lib/email/send-order-notifications";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { getPaytrConfig, verifyPaytrCallbackHash } from "@/lib/payments/paytr";

export async function POST(req: Request) {
  const form = await req.formData();
  const body = {
    merchant_oid: String(form.get("merchant_oid") ?? ""),
    status: String(form.get("status") ?? ""),
    total_amount: String(form.get("total_amount") ?? ""),
    hash: String(form.get("hash") ?? ""),
  };

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = getPaytrConfig(settings);
  if (!cfg || !verifyPaytrCallbackHash(cfg, body)) {
    return new NextResponse("HASH_ERROR", { status: 400 });
  }

  let order = await prisma.storeOrder.findFirst({
    where: {
      siteId: site.id,
      paymentMethod: "card",
      adminNotes: { contains: body.merchant_oid },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!order) {
    const recent = await prisma.storeOrder.findMany({
      where: { siteId: site.id, paymentMethod: "card" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    order =
      recent.find((o) => o.orderNumber.replace(/[^a-zA-Z0-9]/g, "") === body.merchant_oid) ?? null;
  }

  if (!order) {
    return new NextResponse("OK");
  }

  if (body.status === "success") {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "paid",
        status: "confirmed",
      },
    });
    await sendOrderConfirmationBundle(order.id).catch((e) => console.error("[notify]", e));
  } else {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: "failed",
        adminNotes: [order.adminNotes, "PayTR: ödeme başarısız"].filter(Boolean).join(" · "),
      },
    });
  }

  return new NextResponse("OK");
}
