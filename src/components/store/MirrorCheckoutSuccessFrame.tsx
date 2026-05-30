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

export async function MirrorCheckoutSuccessFrame({
  orderNumber,
  accountCreated,
  paid,
  loggedIn,
}: {
  orderNumber?: string;
  accountCreated: boolean;
  paid: boolean;
  loggedIn: boolean;
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
  q.set("paid", paid ? "1" : "0");
  q.set("loggedIn", loggedIn ? "1" : "0");
  const src = `/api/vitrin/mirror?${q.toString()}`;

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={locale === "tr" ? "Siparişiniz alındı" : "Order received"}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
