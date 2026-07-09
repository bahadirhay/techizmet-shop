import { NextResponse } from "next/server";
import { sendOrderConfirmationBundle } from "@/lib/email/send-order-notifications";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { getIyzicoConfig, retrieveIyzicoCheckout } from "@/lib/payments/iyzico";

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ??
    "http://localhost:5555"
  );
}

async function markOrderPaid(orderId: string, siteId: string, orderNumber: string, visitorKey: string | null, customerId: string | null, totalMinor: number) {
  await prisma.storeOrder.update({
    where: { id: orderId },
    data: { paymentStatus: "paid", status: "confirmed" },
  });
  await sendOrderConfirmationBundle(orderId).catch((e) => console.error("[notify]", e));
  try {
    const { recordOrderFinanceOnPayment } = await import("@/lib/finance/order-posting");
    await recordOrderFinanceOnPayment(siteId, orderId);
  } catch (e) {
    console.error("[finance]", e);
  }
  try {
    const { recordStreetFoodContributionOnPayment } = await import("@/lib/street-food-fund/contribution");
    await recordStreetFoodContributionOnPayment(siteId, orderId);
  } catch (e) {
    console.error("[street-food-fund]", e);
  }
  try {
    const { recordPurchaseEvent } = await import("@/lib/analytics/events");
    await recordPurchaseEvent({
      siteId,
      orderId,
      orderNumber,
      valueMinor: totalMinor,
      paymentMethod: "card",
      visitorKey,
      customerId,
    });
  } catch (e) {
    console.error("[analytics]", e);
  }
}

export async function GET() {
  return new NextResponse(
    "iyzico callback aktif. Ödeme sonucu POST ile iletilir.",
    { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "").trim();
  const baseUrl = siteBaseUrl();

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/checkout?failed=1`, 303);
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = getIyzicoConfig(settings);
  if (!cfg) {
    return NextResponse.redirect(`${baseUrl}/checkout?failed=1`, 303);
  }

  const result = await retrieveIyzicoCheckout(cfg, token);
  if (!result.ok || !result.conversationId) {
    return NextResponse.redirect(`${baseUrl}/checkout?failed=1`, 303);
  }

  const order = await prisma.storeOrder.findFirst({
    where: { siteId: site.id, orderNumber: result.conversationId, paymentMethod: "card" },
  });

  if (!order) {
    return NextResponse.redirect(`${baseUrl}/checkout?failed=1`, 303);
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.redirect(
      `${baseUrl}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
      303,
    );
  }

  if (result.paymentStatus === "SUCCESS") {
    const paidMinor = Math.round(Number(result.paidPrice ?? "0") * 100);
    if (!Number.isFinite(paidMinor) || paidMinor !== order.totalMinor) {
      await prisma.storeOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "failed",
          adminNotes: [
            order.adminNotes,
            `iyzico tutar uyuşmazlığı: beklenen ${order.totalMinor}, gelen ${result.paidPrice}`,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      });
      return NextResponse.redirect(
        `${baseUrl}/checkout/pay?order=${encodeURIComponent(order.orderNumber)}&failed=1`,
        303,
      );
    }

    await markOrderPaid(
      order.id,
      site.id,
      order.orderNumber,
      order.visitorKey,
      order.customerId,
      order.totalMinor,
    );

    return NextResponse.redirect(
      `${baseUrl}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
      303,
    );
  }

  await prisma.storeOrder.update({
    where: { id: order.id },
    data: {
      paymentStatus: "failed",
      adminNotes: [order.adminNotes, "iyzico: ödeme başarısız"].filter(Boolean).join(" · "),
    },
  });

  return NextResponse.redirect(
    `${baseUrl}/checkout/pay?order=${encodeURIComponent(order.orderNumber)}&failed=1`,
    303,
  );
}
