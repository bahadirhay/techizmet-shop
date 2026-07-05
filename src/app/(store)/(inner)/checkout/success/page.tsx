import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorCheckoutSuccessFrame } from "@/components/store/MirrorCheckoutSuccessFrame";
import { ThemeShellCommerceView } from "@/components/store/ThemeShellCommerceView";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStreetFoodContributionForOrder } from "@/lib/street-food-fund/order-contribution-message";
import { resolveThemeShellCheckoutSuccessContent } from "@/lib/theme-shell-commerce-content";
import {
  isThemeShellEnabledForCommercePath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<ThemeShellPilotQuery & { order?: string; account?: string }>;
}) {
  const { order: orderNumber, account, ...query } = await searchParams;
  const accountCreated = account === "1";
  const session = await getCustomerSession();
  const loggedIn = Boolean(session.isLoggedIn);

  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  let paid = false;
  let streetFoodContributionMessage: string | undefined;

  if (orderNumber) {
    const row = await prisma.storeOrder.findFirst({
      where: { siteId: site.id, orderNumber },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
      },
    });
    paid = row?.paymentStatus === "paid" || row?.paymentMethod !== "card";
    if (row) {
      const contribution = await getStreetFoodContributionForOrder(site.id, row.id, locale);
      streetFoodContributionMessage = contribution?.message;
    }
  }

  const homepageMode = await getStoreHomepageMode(site.id);
  const themeShellLive = readThemeShellPilotLive();
  const useThemeShell =
    homepageMode === "mirror" &&
    isThemeShellEnabledForCommercePath("/checkout/success", query, themeShellLive);

  if (useThemeShell) {
    const content = resolveThemeShellCheckoutSuccessContent({
      locale,
      orderNumber,
      paid,
      accountCreated,
      loggedIn,
      streetFoodContributionMessage,
    });
    if (!content) notFound();
    return <ThemeShellCommerceView content={content} />;
  }

  if (homepageMode === "mirror") {
    return (
      <MirrorCheckoutSuccessFrame
        orderNumber={orderNumber}
        accountCreated={accountCreated}
        paid={paid}
        loggedIn={loggedIn}
        streetFoodContributionMessage={streetFoodContributionMessage}
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
