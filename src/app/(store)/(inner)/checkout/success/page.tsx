import Link from "next/link";
import { MirrorCheckoutSuccessFrame } from "@/components/store/MirrorCheckoutSuccessFrame";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStreetFoodContributionForOrder } from "@/lib/street-food-fund/order-contribution-message";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; account?: string }>;
}) {
  const { order: orderNumber, account } = await searchParams;
  const accountCreated = account === "1";
  const session = await getCustomerSession();
  const loggedIn = Boolean(session.isLoggedIn);

  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  let paid = false;
  let streetFoodContributionMessage: string | undefined;

  let googleReviewsData:
    | {
        merchantId: string;
        orderId: string;
        email: string;
        deliveryCountry: string;
        estimatedDeliveryDate: string;
        gtins: string[];
      }
    | undefined;

  if (orderNumber) {
    const row = await prisma.storeOrder.findFirst({
      where: { siteId: site.id, orderNumber },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        customerEmail: true,
        shippingAddressJson: true,
        lines: {
          select: {
            product: { select: { barcode: true } },
          },
        },
      },
    });
    paid = row?.paymentStatus === "paid" || row?.paymentMethod !== "card";
    if (row) {
      const contribution = await getStreetFoodContributionForOrder(site.id, row.id, locale);
      streetFoodContributionMessage = contribution?.message;

      const settings = await getSiteSettings(site.id);
      const gcr = settings.seo?.googleCustomerReviews;
      if (gcr?.merchantId?.trim()) {
        const deliveryDays = gcr.deliveryDays ?? 7;
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
        const estimatedDeliveryDate = deliveryDate.toISOString().split("T")[0]!;

        const shippingAddr = row.shippingAddressJson
          ? (JSON.parse(row.shippingAddressJson) as { country?: string; countryCode?: string })
          : null;
        const deliveryCountry =
          shippingAddr?.countryCode?.toUpperCase() ||
          shippingAddr?.country?.slice(0, 2).toUpperCase() ||
          "TR";

        const gtins = row.lines
          .map((l) => l.product?.barcode)
          .filter((b): b is string => Boolean(b?.trim()));

        if (row.customerEmail?.trim()) {
          googleReviewsData = {
            merchantId: gcr.merchantId.trim(),
            orderId: orderNumber,
            email: row.customerEmail.trim(),
            deliveryCountry,
            estimatedDeliveryDate,
            gtins,
          };
        }
      }
    }
  }

  const homepageMode = await getStoreHomepageMode(site.id);
  if (homepageMode === "mirror") {
    return (
      <MirrorCheckoutSuccessFrame
        orderNumber={orderNumber}
        accountCreated={accountCreated}
        paid={paid}
        loggedIn={loggedIn}
        streetFoodContributionMessage={streetFoodContributionMessage}
        googleReviewsData={googleReviewsData}
      />
    );
  }

  return (
    <div className="kn-section kn-checkout-success">
      <h1>{paid ? "Siparişiniz alındı" : "Ödeme işleniyor"}</h1>
      {orderNumber ? (
        <p className="kn-checkout-success__order">
          Sipariş numaranız: <strong>{orderNumber}</strong>
        </p>
      ) : null}
      <p>
        {paid
          ? "Onay e-postası adresinize gönderildi (e-posta ayarlıysa)."
          : "Kart ödemesi onaylandığında e-posta gönderilecektir."}
      </p>
      {streetFoodContributionMessage ? (
        <p className="kn-checkout-success__fund">{streetFoodContributionMessage}</p>
      ) : null}
      {accountCreated ? (
        <p className="kn-checkout-success__account">
          Hesabınız oluşturuldu ve giriş yaptınız. Siparişlerinizi{" "}
          <Link href="/account">hesabım</Link> sayfasından takip edebilirsiniz.
        </p>
      ) : null}
      <div className="kn-checkout-success__actions">
        {orderNumber ? (
          <Link
            href={`/orders/track?order=${encodeURIComponent(orderNumber)}`}
            className="kn-btn kn-btn--primary"
          >
            Siparişi takip et
          </Link>
        ) : null}
        {accountCreated || loggedIn ? (
          <Link href="/account" className="kn-btn kn-btn--outline">
            Hesabım
          </Link>
        ) : (
          <Link href="/account/register" className="kn-btn kn-btn--outline">
            Hesap oluştur
          </Link>
        )}
        <Link href="/collections/all" className="kn-btn kn-btn--outline">
          Alışverişe devam
        </Link>
      </div>
    </div>
  );
}
