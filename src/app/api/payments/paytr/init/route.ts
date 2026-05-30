import { NextResponse } from "next/server";
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

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "127.0.0.1";
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

export async function POST(req: Request) {
  const body = (await req.json()) as { orderNumber?: string };
  const orderNumber = String(body.orderNumber ?? "").trim();
  if (!orderNumber) {
    return NextResponse.json({ error: "Sipariş numarası gerekli" }, { status: 400 });
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
    merchant_fail_url: `${baseUrl}/checkout/pay?order=${encodeURIComponent(order.orderNumber)}&failed=1`,
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

  return NextResponse.json({ token: result.token, iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}` });
}
