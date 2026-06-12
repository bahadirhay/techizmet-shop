import { NextResponse } from "next/server";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyPaytrInitToken } from "@/lib/payments/paytr-access";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import {
  buildPaytrToken,
  encodePaytrBasket,
  getPaytrConfig,
  paytrMerchantOid,
  requestPaytrIframeToken,
} from "@/lib/payments/paytr";

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`paytr-init:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json()) as { orderNumber?: string; paymentToken?: string };
  const orderNumber = String(body.orderNumber ?? "").trim();
  const paymentToken = String(body.paymentToken ?? "").trim();
  if (!orderNumber || !paymentToken) {
    return NextResponse.json({ error: "Geçersiz ödeme isteği" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = getPaytrConfig(settings);
  if (!cfg) {
    return NextResponse.json({ error: "PayTR yapılandırılmamış" }, { status: 400 });
  }

  const order = await prisma.storeOrder.findFirst({
    where: { siteId: site.id, orderNumber },
    include: { lines: true },
  });
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  if (!verifyPaytrInitToken(paymentToken, order.id, order.orderNumber)) {
    return NextResponse.json({ error: "Ödeme oturumu geçersiz veya süresi dolmuş" }, { status: 403 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ error: "Sipariş zaten ödendi" }, { status: 400 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ??
    "http://localhost:5555";
  const merchantOid = paytrMerchantOid(order.orderNumber);
  const userBasket = encodePaytrBasket(
    order.lines.map((l) => ({ title: l.title, unitMinor: l.unitMinor, qty: l.qty })),
  );
  const userIp = clientIp(req);
  const email = order.customerEmail ?? "guest@example.com";

  const paytrToken = buildPaytrToken(cfg, {
    userIp,
    merchantOid,
    email,
    paymentAmountMinor: order.totalMinor,
    userBasketB64: userBasket,
  });

  const form: Record<string, string> = {
    merchant_id: cfg.merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email,
    payment_amount: String(order.totalMinor),
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: cfg.testMode ? "1" : "0",
    test_mode: cfg.testMode ? "1" : "0",
    no_installment: "0",
    max_installment: "0",
    user_name: order.customerName ?? "Müşteri",
    user_address: "Türkiye",
    user_phone: order.customerPhone ?? "05000000000",
    merchant_ok_url: `${baseUrl}/checkout/success?order=${encodeURIComponent(order.orderNumber)}`,
    merchant_fail_url: `${baseUrl}/checkout/pay?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(paymentToken)}&failed=1`,
    timeout_limit: "30",
    currency: "TL",
    lang: "tr",
  };

  const result = await requestPaytrIframeToken(cfg, form);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await prisma.storeOrder.update({
    where: { id: order.id },
    data: { adminNotes: [order.adminNotes, `PayTR OID: ${merchantOid}`].filter(Boolean).join(" · ") },
  });

  return NextResponse.json({
    token: result.token,
    iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`,
    testMode: cfg.testMode,
  });
}
