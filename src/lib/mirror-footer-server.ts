import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { getSiteSettings } from "@/lib/site-settings";
import {
  footerColumnTitle,
  footerIntroHtml,
  footerLinkLabel,
  footerTaglineHtml,
  getStoreFooterConfig,
} from "@/lib/store-footer";

export async function loadMirrorFooterData(
  siteId: string,
  locale: ShopLocale,
): Promise<MirrorFooterData> {
  const settings = await getSiteSettings(siteId);
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
