import { NextResponse } from "next/server";
import { cartLinesToSnapshot } from "@/lib/analytics/cart-snapshot";
import { touchCartAbandonmentCheckout } from "@/lib/analytics/cart-abandonment";
import { recordServerStoreEvent } from "@/lib/analytics/events";
import { readVisitorKey } from "@/lib/analytics/visitor";
import { buildCartView, getShippingOptions } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { normalizeConsumerTaxId } from "@/lib/efatura/consumer-tax-id";
import { getCustomerSession } from "@/lib/customer-session";
import {
  createCardCheckoutIntent,
  generateCardPaymentReference,
  type CardCheckoutIntentPayload,
} from "@/lib/payments/card-checkout-intent";
import { issueCardIntentToken } from "@/lib/payments/card-intent-token";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getSiteSettings, isCardPaymentEnabled } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { formatCheckoutLine1 } from "@/lib/tr-address/format";

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`card-prepare:${clientIp(req)}`, 30, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const body = (await req.json()) as Record<string, unknown>;
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);

  if (!isCardPaymentEnabled(settings)) {
    return NextResponse.json(
      { error: "Kartlı ödeme şu an kullanılamıyor." },
      { status: 400 },
    );
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

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!email || !phone) {
    return NextResponse.json({ error: "E-posta ve telefon zorunlu" }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Ad ve soyad zorunlu" }, { status: 400 });
  }

  const billingSameAsShipping = body.billingSameAsShipping !== false;
  const taxOffice = String(body.taxOffice ?? "").trim() || undefined;
  const billingTaxId = normalizeConsumerTaxId(String(body.taxId ?? "").trim() || undefined);

  const shippingAddress = { city, district, line1, postalCode, firstName, lastName };

  let billingAddress = shippingAddress;
  if (!billingSameAsShipping) {
    const bNeighborhood = String(body.billingNeighborhood ?? "").trim();
    const bStreet = String(body.billingLine1 ?? "").trim();
    const bCity = String(body.billingCity ?? "").trim();
    const bDistrict = String(body.billingDistrict ?? "").trim();
    const bLine1 = formatCheckoutLine1(bNeighborhood, bStreet) || bStreet;
    if (!bCity || !bDistrict || !bNeighborhood || !bStreet) {
      return NextResponse.json({ error: "Fatura adresi: il, ilçe, mahalle ve sokak zorunlu" }, { status: 400 });
    }
    billingAddress = {
      city: bCity,
      district: bDistrict,
      line1: bLine1,
      postalCode: String(body.billingPostalCode ?? "").trim() || undefined,
      firstName: String(body.billingFirstName ?? "").trim() || firstName,
      lastName: String(body.billingLastName ?? "").trim() || lastName,
    };
  }

  const carrierId = String(body.carrierId ?? "");
  const rateId = String(body.rateId ?? "");

  try {
    const custSession = await getCustomerSession();
    const visitorKey = await readVisitorKey();
    const customerId = custSession.isLoggedIn ? custSession.customerId : null;

    const cartPreview = await buildCartView(
      { items: session.items, couponCode: session.couponCode },
      site.id,
      customerId,
    );

    if (cartPreview.items.length === 0) {
      return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
    }
    if (cartPreview.errors.length) {
      return NextResponse.json({ error: cartPreview.errors[0] }, { status: 400 });
    }

    const discountMinor = cartPreview.discountMinor;
    const totalDesi = Math.max(
      1,
      (
        await prisma.storeProduct.findMany({
          where: { id: { in: cartPreview.items.map((i) => i.productId) } },
          select: { desi: true },
        })
      ).reduce((s, p) => s + (p.desi ?? 1), 0),
    );
    const shippingOptions = await getShippingOptions(
      site.id,
      cartPreview.subtotalMinor - discountMinor,
      cartPreview.freeShipping,
      totalDesi,
    );
    const selected = cartPreview.freeShipping
      ? null
      : shippingOptions.find((o) => o.carrierId === carrierId && o.rateId === rateId);
    if (!cartPreview.freeShipping && !selected) {
      return NextResponse.json({ error: "Kargo seçimi geçersiz" }, { status: 400 });
    }
    const shippingMinor = cartPreview.freeShipping ? 0 : (selected?.priceMinor ?? 0);
    const orderTotalMinor = Math.max(0, cartPreview.subtotalMinor - discountMinor + shippingMinor);

    recordServerStoreEvent({
      siteId: site.id,
      type: "begin_checkout",
      payload: {
        cartValueMinor: cartPreview.totalMinor,
        itemCount: cartPreview.itemCount,
        paymentMethod: "card",
      },
      visitorKey,
      customerId,
    }).catch((e) => console.error("[analytics]", e));

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

    const payload: CardCheckoutIntentPayload = {
      session: { items: session.items, couponCode: session.couponCode },
      customerId: customerId ?? null,
      customer: {
        email,
        phone,
        firstName,
        lastName,
        address: shippingAddress,
        billingAddress,
        billingTaxId,
        billingTaxOffice: taxOffice,
      },
      carrierId,
      rateId,
      createAccount: Boolean(body.createAccount) && !custSession.isLoggedIn,
      accountPassword:
        Boolean(body.createAccount) && !custSession.isLoggedIn
          ? String(body.accountPassword ?? "")
          : undefined,
      saveAddress: Boolean(custSession.isLoggedIn && body.saveAddress),
      guestLoggedIn: custSession.isLoggedIn,
    };

    const reference = generateCardPaymentReference();
    const intent = await createCardCheckoutIntent({
      siteId: site.id,
      reference,
      payload,
      totalMinor: orderTotalMinor,
      customerId: customerId ?? null,
      visitorKey: visitorKey ?? null,
    });

    const paymentToken = issueCardIntentToken(intent.id, reference);

    return NextResponse.json({
      ok: true,
      reference,
      paymentToken,
      totalMinor: orderTotalMinor,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ödeme hazırlanamadı";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
