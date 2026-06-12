import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function favoritesMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/techizmet-shop/mirror/account/favorites-tr.html"
    : "theme/techizmet-shop/mirror/account/favorites.html";
}

export async function MirrorFavoritesFrame() {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const src = await resolveStoreMirrorIframeSrcForRequest(favoritesMirrorRel(locale));

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={locale === "tr" ? "Favorilerim" : "Favorites"}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
