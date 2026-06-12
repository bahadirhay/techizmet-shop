import type { ShopLocale } from "@/lib/i18n/locale";
import { getMirrorHomeConfig } from "@/lib/mirror-home-sections";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { MirrorHomeFrameClient } from "@/components/store/MirrorHomeFrameClient";

/** Techizmet Shop mirror ana sayfa — admin ayarları iframe overlay */
export async function MirrorHomeFrame({ locale }: { locale: ShopLocale }) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homeConfig = getMirrorHomeConfig(settings);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const src = await resolveStoreMirrorIframeSrcForRequest(
    locale === "tr" ? "theme/techizmet-shop/mirror/index-tr.html" : "theme/techizmet-shop/mirror/index.html",
    "home",
  );

  return (
    <MirrorHomeFrameClient
      src={src}
      title="Techizmet Shop — Ana sayfa"
      homeConfig={homeConfig}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
