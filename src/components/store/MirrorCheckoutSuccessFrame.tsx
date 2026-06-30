import Script from "next/script";
import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function successMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/techizmet-shop/mirror/checkout/success-tr.html"
    : "theme/techizmet-shop/mirror/checkout/success.html";
}

type GoogleReviewsData = {
  merchantId: string;
  orderId: string;
  email: string;
  deliveryCountry: string;
  estimatedDeliveryDate: string;
  gtins: string[];
};

function GoogleCustomerReviewsScript({ data }: { data: GoogleReviewsData }) {
  const products = data.gtins.length
    ? data.gtins.map((g) => ({ gtin: g }))
    : undefined;

  const renderCall = JSON.stringify({
    merchant_id: Number(data.merchantId),
    order_id: data.orderId,
    email: data.email,
    delivery_country: data.deliveryCountry,
    estimated_delivery_date: data.estimatedDeliveryDate,
    ...(products ? { products } : {}),
  });

  return (
    <>
      <Script
        src="https://apis.google.com/js/platform.js?onload=renderOptIn"
        strategy="afterInteractive"
        async
        defer
      />
      <Script id="kn-google-customer-reviews" strategy="afterInteractive">
        {`window.renderOptIn=function(){window.gapi.load('surveyoptin',function(){window.gapi.surveyoptin.render(${renderCall});});};`}
      </Script>
    </>
  );
}

export async function MirrorCheckoutSuccessFrame({
  orderNumber,
  accountCreated,
  paid,
  loggedIn,
  streetFoodContributionMessage,
  googleReviewsData,
}: {
  orderNumber?: string;
  accountCreated: boolean;
  paid: boolean;
  loggedIn: boolean;
  streetFoodContributionMessage?: string;
  googleReviewsData?: GoogleReviewsData;
}) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);

  const q = new URLSearchParams({ path: successMirrorRel(locale) });
  if (orderNumber) q.set("order", orderNumber);
  if (accountCreated) q.set("account", "1");
  if (streetFoodContributionMessage) {
    q.set("fundMsg", streetFoodContributionMessage);
  }
  q.set("paid", paid ? "1" : "0");
  q.set("loggedIn", loggedIn ? "1" : "0");
  const src = `/api/vitrin/mirror?${q.toString()}`;

  return (
    <>
      {googleReviewsData && <GoogleCustomerReviewsScript data={googleReviewsData} />}
      <MirrorVitrinFrameClient
        src={src}
        title={locale === "tr" ? "Siparişiniz alındı" : "Order received"}
        branding={branding}
        nav={nav}
        footer={footer}
        locale={locale}
      />
    </>
  );
}
