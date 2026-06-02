import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import { resolveStoreMirrorIframeSrc } from "@/lib/mirror-prebuilt-resolve";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function cartMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/techizmet-shop/mirror/cart/index-tr.html"
    : "theme/techizmet-shop/mirror/cart/index.html";
}

export async function MirrorCartFrame() {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const src = resolveStoreMirrorIframeSrc(cartMirrorRel(locale));

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={locale === "tr" ? "Sepetim" : "Cart"}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
