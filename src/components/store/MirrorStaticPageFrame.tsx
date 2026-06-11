import { MirrorPageFrameClient } from "@/components/store/MirrorPageFrameClient";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import type { MirrorContactData } from "@/lib/mirror-contact-overlay";

/** HTTrack mirror — statik sayfalar (about, contact, faq) */
export async function MirrorStaticPageFrame({
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

  // İletişim sayfası — harita ayarları
  const contactSettings = slug === "contact" ? settings.pages?.contact : undefined;
  const contact: MirrorContactData | undefined = contactSettings
    ? {
        mapEmbedUrl: contactSettings.mapEmbedUrl,
        mapPosition: contactSettings.mapPosition,
      }
    : undefined;

  // Harita URL'sini iframe src'sine query param olarak göm — en güvenilir yöntem
  // HTML içindeki script location.search'ten okur (overlay veya postMessage'a gerek yok)
  const baseSrc = toBrandedMirrorSrc(
    locale === "tr"
      ? `theme/techizmet-shop/mirror/pages/${slug}-tr.html`
      : `theme/techizmet-shop/mirror/pages/${slug}.html`,
  );
  const src =
    contactSettings?.mapEmbedUrl
      ? `${baseSrc}?kn_map=${encodeURIComponent(contactSettings.mapEmbedUrl)}`
      : baseSrc;

  return (
    <MirrorPageFrameClient
      src={src}
      title={title ?? `Page — ${slug}`}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      contact={contact}
    />
  );
}
