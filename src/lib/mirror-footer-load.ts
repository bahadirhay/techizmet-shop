import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import {
  footerColumnTitle,
  footerIntroHtml,
  footerLinkLabel,
  footerTaglineHtml,
  getStoreFooterConfig,
} from "@/lib/store-footer";

/** Derleme ve çalışma zamanı — önbelleksiz footer (prebuild betiği ile uyumlu) */
export async function loadMirrorFooterDataUncached(
  siteId: string,
  locale: ShopLocale,
): Promise<MirrorFooterData> {
  const settings = await getSiteSettingsUncached(siteId);
  const config = getStoreFooterConfig(settings);
  return {
    introHtml: footerIntroHtml(config, locale),
    taglineHtml: footerTaglineHtml(config, locale),
    columns: (config.columns ?? []).map((col) => ({
      title: footerColumnTitle(col, locale),
      links: col.links.map((l) => ({
        href: l.href,
        label: footerLinkLabel(l, locale),
      })),
    })),
  };
}
