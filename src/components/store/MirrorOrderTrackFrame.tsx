import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import { mirrorVitrinApiSrc } from "@/lib/mirror-iframe-src";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function orderTrackMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/techizmet-shop/mirror/orders/track-tr.html"
    : "theme/techizmet-shop/mirror/orders/track.html";
}

export async function MirrorOrderTrackFrame({ initialOrder }: { initialOrder?: string }) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const rel = orderTrackMirrorRel(locale);

  const src = initialOrder?.trim()
    ? mirrorVitrinApiSrc(rel, undefined, { order: initialOrder.trim() })
    : await resolveStoreMirrorIframeSrcForRequest(rel);

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={locale === "tr" ? "Sipariş takip" : "Track order"}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
