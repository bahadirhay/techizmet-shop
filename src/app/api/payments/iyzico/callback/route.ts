import { NextResponse } from "next/server";
import { abandonCardPaymentIntent, fulfillCardPaymentIntent } from "@/lib/payments/fulfill-card-payment-intent";
import { loadCardCheckoutIntent } from "@/lib/payments/card-checkout-intent";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { getIyzicoConfig, retrieveIyzicoCheckout } from "@/lib/payments/iyzico";
import { markCardOrderPaymentFailed } from "@/lib/orders/card-payment";
import { prisma } from "@/lib/prisma";

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ??
    "http://localhost:5555"
  );
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
    return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = getIyzicoConfig(settings);
  if (!cfg) {
    return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
  }

  const result = await retrieveIyzicoCheckout(cfg, token);
  if (!result.ok || !result.conversationId) {
    return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
  }

  const reference = result.conversationId;
  const intentLoaded = await loadCardCheckoutIntent(site.id, reference);

  if (intentLoaded) {
    if (result.paymentStatus === "SUCCESS") {
      const paidMinor = Math.round(Number(result.paidPrice ?? "0") * 100);
      if (!Number.isFinite(paidMinor) || paidMinor !== intentLoaded.intent.totalMinor) {
        await abandonCardPaymentIntent(site.id, reference);
        return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
      }

      const fulfilled = await fulfillCardPaymentIntent(site.id, reference);
      if (!fulfilled) {
        return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
      }

      return NextResponse.redirect(
        `${baseUrl}/checkout/success?order=${encodeURIComponent(fulfilled.orderNumber)}`,
        303,
      );
    }

    await abandonCardPaymentIntent(site.id, reference);
    return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
  }

  const order = await prisma.storeOrder.findFirst({
    where: { siteId: site.id, orderNumber: reference, paymentMethod: "card" },
  });

  if (!order) {
    return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
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
      await markCardOrderPaymentFailed(
        order.id,
        `iyzico tutar uyuşmazlığı: beklenen ${order.totalMinor}, gelen ${result.paidPrice}`,
      );
      return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
    }

    const { recordOrderStockAfterCardPayment } = await import("@/lib/orders/card-payment");
    const { sendOrderConfirmationBundle } = await import("@/lib/email/send-order-notifications");

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "paid", status: "confirmed" },
    });
    await recordOrderStockAfterCardPayment(site.id, order.id);
    await sendOrderConfirmationBundle(order.id).catch((e) => console.error("[notify]", e));

    return NextResponse.redirect(
      `${baseUrl}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
      303,
    );
  }

  await markCardOrderPaymentFailed(order.id, "iyzico: ödeme başarısız");
  return NextResponse.redirect(`${baseUrl}/checkout?payment_failed=1`, 303);
}
