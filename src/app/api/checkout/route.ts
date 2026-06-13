import { NextResponse } from "next/server";
import { cartLinesToSnapshot } from "@/lib/analytics/cart-snapshot";
import { touchCartAbandonmentCheckout } from "@/lib/analytics/cart-abandonment";
import { recordPurchaseEvent, recordServerStoreEvent } from "@/lib/analytics/events";
import { readVisitorKey } from "@/lib/analytics/visitor";
import { createOrderFromCart, buildCartView } from "@/lib/cart/service";
import { clearCartSession, getCartSession } from "@/lib/cart/session";
import { createAccountAfterOrder } from "@/lib/checkout/create-account-after-order";
import { saveCheckoutAddressToCustomer } from "@/lib/checkout/save-address";
import { getCustomerSession } from "@/lib/customer-session";
import { sendOrderConfirmationBundle } from "@/lib/email/send-order-notifications";
import { getSiteSettings, isCardPaymentEnabled } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { formatCheckoutLine1 } from "@/lib/tr-address/format";
import { issuePaytrInitToken } from "@/lib/payments/paytr-access";

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);

  const paymentMethod = String(body.paymentMethod ?? "cod");
  if (paymentMethod === "card" && !isCardPaymentEnabled(settings)) {
    return NextResponse.json(
      { error: "Kartlı ödeme kapalı. Admin → Entegrasyon → Ödeme bölümünden PayTR bilgilerini girin." },
      { status: 400 },
    );
  }
  if (paymentMethod === "cod" && !settings.payment?.codEnabled) {
    return NextResponse.json({ error: "Kapıda ödeme şu an kapalı" }, { status: 400 });
  }
  if (paymentMethod === "bank_transfer" && !settings.payment?.bankTransferEnabled) {
    return NextResponse.json({ error: "Havale/EFT şu an kapalı" }, { status: 400 });
  }

  if (!body.acceptTerms) {
    return NextResponse.json({ error: "Mesafeli satış sözleşmesini onaylamalısınız" }, { status: 400 });
  }

  const session = await getCartSession();
  const neighborhood = String(body.neighborhood ?? "").trim();
  const streetLine = String(body.line1 ?? "").trim();
  const line1 = formatCheckoutLine1(neighborhood, streetLine) || streetLine;
  const city = String(body.city ?? "").trim();
  const district = String(body.district ?? "").trim();
  const postalCode = String(body.postalCode ?? "").trim() || undefined;

  if (!city || !district || !neighborhood || !streetLine) {
    return NextResponse.json({ error: "İl, ilçe, mahalle ve adres zorunlu" }, { status: 400 });
  }

  try {
    const custSession = await getCustomerSession();
    const visitorKey = await readVisitorKey();
    const customerId = custSession.isLoggedIn ? custSession.customerId : null;

    const cartPreview = await buildCartView(
      { items: session.items, couponCode: session.couponCode },
      site.id,
      customerId,
    );

    recordServerStoreEvent({
      siteId: site.id,
      type: "begin_checkout",
      payload: {
        cartValueMinor: cartPreview.totalMinor,
        itemCount: cartPreview.itemCount,
        paymentMethod,
      },
      visitorKey,
      customerId,
    }).catch((e) => console.error("[analytics]", e));

    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (visitorKey) {
      await touchCartAbandonmentCheckout({
        siteId: site.id,
        visitorKey,
        customerId,
        guestEmail: email || null,
        guestPhone: phone || null,
        items: cartLinesToSnapshot(cartPreview.items),
        cartValueMinor: cartPreview.subtotalMinor,
      }).catch((e) => console.error("[cart abandonment checkout]", e));
    }

    const result = await createOrderFromCart({
      siteId: site.id,
      customerId,
      session: { items: session.items, couponCode: session.couponCode },
      customer: {
        email,
        phone,
        firstName: String(body.firstName ?? "").trim(),
        lastName: String(body.lastName ?? "").trim(),
        address: {
          city,
          district,
          line1,
          postalCode,
        },
      },
      carrierId: String(body.carrierId ?? ""),
      rateId: String(body.rateId ?? ""),
      paymentMethod,
      guestCheckout: true,
      visitorKey,
    });
    await clearCartSession();

    let accountCreated = false;
    const wantsAccount = Boolean(body.createAccount) && !custSession.isLoggedIn;
    const accountPassword = String(body.accountPassword ?? "");
    if (wantsAccount && accountPassword.length >= 6) {
      const acc = await createAccountAfterOrder({
        siteId: site.id,
        customerId: result.customerId ?? null,
        email: String(body.email ?? "").trim(),
        password: accountPassword,
        firstName: String(body.firstName ?? "").trim(),
        lastName: String(body.lastName ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        address: { city, district, line1, postalCode },
      });
      accountCreated = acc.ok && Boolean(acc.loggedIn);
    }

    if (custSession.isLoggedIn && custSession.customerId && Boolean(body.saveAddress)) {
      await saveCheckoutAddressToCustomer({
        customerId: custSession.customerId,
        firstName: String(body.firstName ?? "").trim(),
        lastName: String(body.lastName ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        city,
        district,
        line1,
        postalCode,
      }).catch((e) => console.error("[checkout saveAddress]", e));
    }

    if (paymentMethod === "card") {
      const paymentToken = issuePaytrInitToken(result.orderId, result.orderNumber);
      return NextResponse.json({
        ok: true,
        ...result,
        paymentRequired: true,
        paymentToken,
        accountCreated,
        redirectUrl: `/checkout/pay?order=${encodeURIComponent(result.orderNumber)}&token=${encodeURIComponent(paymentToken)}`,
      });
    }

    await sendOrderConfirmationBundle(result.orderId).catch((e) => console.error("[notify]", e));

    recordPurchaseEvent({
      siteId: site.id,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      valueMinor: cartPreview.totalMinor,
      paymentMethod,
      visitorKey,
      customerId: result.customerId,
    }).catch((e) => console.error("[analytics]", e));

    return NextResponse.json({ ok: true, ...result, accountCreated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sipariş oluşturulamadı";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
