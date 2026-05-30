import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function favoritesMirrorRel(locale: "tr" | "en") {
  return locale === "tr"
    ? "theme/king-noor/mirror/account/favorites-tr.html"
    : "theme/king-noor/mirror/account/favorites.html";
}

export async function MirrorFavoritesFrame() {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const src = toBrandedMirrorSrc(favoritesMirrorRel(locale));

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
