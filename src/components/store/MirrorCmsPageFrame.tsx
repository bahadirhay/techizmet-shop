import { MirrorPageFrameClient } from "@/components/store/MirrorPageFrameClient";
import type { ShopLocale } from "@/lib/i18n/locale";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** CMS sayfaları (mesafeli-satis vb.) — about kabuğu + admin blokları */
export async function MirrorCmsPageFrame({
  slug,
  locale,
  title,
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
}) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);

  const shell =
    locale === "tr"
      ? "theme/techizmet-shop/mirror/pages/about-tr.html"
      : "theme/techizmet-shop/mirror/pages/about.html";

  const src = await resolveStoreMirrorIframeSrcForRequest(shell, undefined, { cmsSlug: slug });

  return (
    <MirrorPageFrameClient
      src={src}
      title={title ?? `Page — ${slug}`}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
    />
  );
}
