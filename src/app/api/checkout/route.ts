import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/lib/cart/service";
import { clearCartSession, getCartSession } from "@/lib/cart/session";
import { createAccountAfterOrder } from "@/lib/checkout/create-account-after-order";
import { getCustomerSession } from "@/lib/customer-session";
import { sendOrderConfirmationBundle } from "@/lib/email/send-order-notifications";
import { getSiteSettings, isCardPaymentEnabled } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

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
  try {
    const custSession = await getCustomerSession();
    const result = await createOrderFromCart({
      siteId: site.id,
      customerId: custSession.isLoggedIn ? custSession.customerId : null,
      session: { items: session.items, couponCode: session.couponCode },
      customer: {
        email: String(body.email ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        firstName: String(body.firstName ?? "").trim(),
        lastName: String(body.lastName ?? "").trim(),
        address: {
          city: String(body.city ?? "").trim(),
          district: String(body.district ?? "").trim(),
          line1: String(body.line1 ?? "").trim(),
          postalCode: String(body.postalCode ?? "").trim() || undefined,
        },
      },
      carrierId: String(body.carrierId ?? ""),
      rateId: String(body.rateId ?? ""),
      paymentMethod,
      guestCheckout: true,
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
        address: {
          city: String(body.city ?? "").trim(),
          district: String(body.district ?? "").trim(),
          line1: String(body.line1 ?? "").trim(),
          postalCode: String(body.postalCode ?? "").trim() || undefined,
        },
      });
      accountCreated = acc.ok && Boolean(acc.loggedIn);
    }

    if (paymentMethod === "card") {
      return NextResponse.json({
        ok: true,
        ...result,
        paymentRequired: true,
        accountCreated,
        redirectUrl: `/checkout/pay?order=${encodeURIComponent(result.orderNumber)}`,
      });
    }

    await sendOrderConfirmationBundle(result.orderId).catch((e) => console.error("[notify]", e));

    return NextResponse.json({ ok: true, ...result, accountCreated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sipariş oluşturulamadı";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
