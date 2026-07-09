import { NextResponse } from "next/server";
import { buildCartView } from "@/lib/cart/service";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { verifyCardIntentToken } from "@/lib/payments/card-intent-token";
import {
  loadCardCheckoutIntent,
  setCardCheckoutIntentIyzicoToken,
} from "@/lib/payments/card-checkout-intent";
import { verifyPaytrInitToken } from "@/lib/payments/paytr-access";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { resolveCardProvider } from "@/lib/payments/card-provider";
import {
  buildIyzicoBasketFromOrder,
  getIyzicoConfig,
  initializeIyzicoCheckout,
} from "@/lib/payments/iyzico";
import {
  buildPaytrToken,
  encodePaytrBasket,
  getPaytrConfig,
  paytrMerchantOid,
  requestPaytrIframeToken,
} from "@/lib/payments/paytr";

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ??
    "http://localhost:5555"
  );
}

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`card-init:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json()) as {
    orderNumber?: string;
    reference?: string;
    paymentToken?: string;
  };
  const orderNumber = String(body.orderNumber ?? "").trim();
  const reference = String(body.reference ?? "").trim();
  const paymentToken = String(body.paymentToken ?? "").trim();

  if (!paymentToken || (!orderNumber && !reference)) {
    return NextResponse.json({ error: "Geçersiz ödeme isteği" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const provider = resolveCardProvider(settings);
  if (!provider) {
    return NextResponse.json({ error: "Kartlı ödeme yapılandırılmamış" }, { status: 400 });
  }

  const baseUrl = siteBaseUrl();

  if (reference) {
    const loaded = await loadCardCheckoutIntent(site.id, reference);
    if (!loaded) {
      return NextResponse.json({ error: "Ödeme oturumu süresi doldu. Lütfen tekrar deneyin." }, { status: 404 });
    }
    const { intent, payload } = loaded;
    if (!verifyCardIntentToken(paymentToken, intent.id, reference)) {
      return NextResponse.json({ error: "Ödeme oturumu geçersiz veya süresi dolmuş" }, { status: 403 });
    }

    const cart = await buildCartView(
      payload.session,
      site.id,
      payload.customerId,
      payload.customer.email,
    );
    if (!cart.items.length) {
      return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
    }

    const shippingMinor = Math.max(0, intent.totalMinor - (cart.subtotalMinor - cart.discountMinor));
    const basketItems = buildIyzicoBasketFromOrder({
      lines: cart.items.map((line) => ({
        id: line.productId,
        title: line.title,
        lineMinor: line.lineMinor,
        discountMinor: line.discountMinor,
      })),
      shippingMinor,
      totalMinor: intent.totalMinor,
    });

    if (provider === "iyzico") {
      const cfg = getIyzicoConfig(settings);
      if (!cfg) return NextResponse.json({ error: "iyzico yapılandırılmamış" }, { status: 400 });

      const result = await initializeIyzicoCheckout(cfg, {
        conversationId: reference,
        basketId: intent.id,
        priceMinor: intent.totalMinor,
        callbackUrl: `${baseUrl}/api/payments/iyzico/callback`,
        buyer: {
          name: payload.customer.firstName,
          surname: payload.customer.lastName,
          email: payload.customer.email,
          phone: payload.customer.phone,
          city: payload.customer.address.city || "Istanbul",
          address: payload.customer.address.line1 || "Türkiye",
        },
        basketItems,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      await setCardCheckoutIntentIyzicoToken(intent.id, result.token);

      return NextResponse.json({
        provider: "iyzico",
        paymentPageUrl: result.paymentPageUrl,
        checkoutFormContent: result.checkoutFormContent,
        testMode: cfg.testMode,
      });
    }

    const cfg = getPaytrConfig(settings);
    if (!cfg) return NextResponse.json({ error: "PayTR yapılandırılmamış" }, { status: 400 });

    const merchantOid = paytrMerchantOid(reference);
    const userBasket = encodePaytrBasket(
      cart.items.map((l) => ({ title: l.title, unitMinor: l.unitMinor, qty: l.qty })),
    );
    const userIp = clientIp(req);
    const paytrToken = buildPaytrToken(cfg, {
      userIp,
      merchantOid,
      email: payload.customer.email,
      paymentAmountMinor: intent.totalMinor,
      userBasketB64: userBasket,
    });

    const form: Record<string, string> = {
      merchant_id: cfg.merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: payload.customer.email,
      payment_amount: String(intent.totalMinor),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: cfg.testMode ? "1" : "0",
      test_mode: cfg.testMode ? "1" : "0",
      no_installment: "0",
      max_installment: "0",
      user_name: `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
      user_address: payload.customer.address.line1 || "Türkiye",
      user_phone: payload.customer.phone,
      merchant_ok_url: `${baseUrl}/checkout/payment-return?reference=${encodeURIComponent(reference)}`,
      merchant_fail_url: `${baseUrl}/checkout?payment_failed=1`,
      timeout_limit: "30",
      currency: "TL",
      lang: "tr",
    };

    const result = await requestPaytrIframeToken(cfg, form);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      provider: "paytr",
      iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`,
      testMode: cfg.testMode,
    });
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

  if (provider === "iyzico") {
    const cfg = getIyzicoConfig(settings);
    if (!cfg) return NextResponse.json({ error: "iyzico yapılandırılmamış" }, { status: 400 });

    const nameParts = (order.customerName ?? "Müşteri").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "Müşteri";
    const lastName = nameParts.slice(1).join(" ") || "Müşteri";

    const basketItems = buildIyzicoBasketFromOrder(order);

    const result = await initializeIyzicoCheckout(cfg, {
      conversationId: order.orderNumber,
      basketId: order.id,
      priceMinor: order.totalMinor,
      callbackUrl: `${baseUrl}/api/payments/iyzico/callback`,
      buyer: {
        name: firstName,
        surname: lastName,
        email: order.customerEmail ?? "guest@example.com",
        phone: order.customerPhone ?? "05000000000",
        city: "Istanbul",
        address: "Türkiye",
      },
      basketItems,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        adminNotes: [order.adminNotes, `iyzico token: ${result.token}`].filter(Boolean).join(" · "),
      },
    });

    return NextResponse.json({
      provider: "iyzico",
      paymentPageUrl: result.paymentPageUrl,
      checkoutFormContent: result.checkoutFormContent,
      testMode: cfg.testMode,
    });
  }

  const cfg = getPaytrConfig(settings);
  if (!cfg) return NextResponse.json({ error: "PayTR yapılandırılmamış" }, { status: 400 });

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
    provider: "paytr",
    iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`,
    testMode: cfg.testMode,
  });
}
