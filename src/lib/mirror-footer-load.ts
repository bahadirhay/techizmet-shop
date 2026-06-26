import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { detectSocialLinks } from "@/lib/social-links";
import {
  DEFAULT_FOOTER_BOTTOM_LINKS,
  DEFAULT_STORE_FOOTER,
  PAYMENT_ICON_IDS,
  footerBottomLinkLabel,
  footerColumnTitle,
  footerIntroHtml,
  footerLinkLabel,
  footerTaglineHtml,
  getStoreFooterConfig,
  type FooterMenuColumn,
} from "@/lib/store-footer";

function colToMirror(col: FooterMenuColumn, locale: ShopLocale) {
  return {
    title: footerColumnTitle(col, locale),
    links: col.links.map((l) => ({ href: l.href, label: footerLinkLabel(l, locale) })),
  };
}

/** Derleme ve çalışma zamanı — önbelleksiz footer (prebuild betiği ile uyumlu) */
export async function loadMirrorFooterDataUncached(
  siteId: string,
  locale: ShopLocale,
): Promise<MirrorFooterData> {
  const settings = await getSiteSettingsUncached(siteId);
  const config = getStoreFooterConfig(settings);

  const savedCols = config.columns ?? [];
  const defaultCols = DEFAULT_STORE_FOOTER.columns ?? [];

  // DB'de eksik sütunları varsayılandan tamamla — her sayfada aynı footer görünsün
  const savedIds = new Set(savedCols.map((c) => c.id));
  const missingDefaults = defaultCols.filter((c) => !savedIds.has(c.id));
  const allCols = [...savedCols, ...missingDefaults];

  const bottomLinks = (config.bottomLinks?.length ? config.bottomLinks : DEFAULT_FOOTER_BOTTOM_LINKS)
    .map((l) => ({ href: l.href, label: footerBottomLinkLabel(l, locale) }));

  return {
    introHtml: footerIntroHtml(config, locale),
    taglineHtml: footerTaglineHtml(config, locale),
    columns: allCols.map((col) => colToMirror(col, locale)),
    bottomLinks,
    paymentIcons: config.paymentIcons ?? [...PAYMENT_ICON_IDS],
    socialLinks: detectSocialLinks(settings.seo?.organizationSameAs),
  };
}
