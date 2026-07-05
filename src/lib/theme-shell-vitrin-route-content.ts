import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import {
  resolveThemeShellSectionsContent,
  type ThemeShellSectionsContent,
} from "@/lib/theme-shell-sections-content";
import { themeShellVitrinKeyFromPath } from "@/lib/theme-shell-pilot";

/** /blogs/news, /collections, /sokak-dostlari → MainContent bölümleri */
export function resolveThemeShellVitrinRouteContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  pathname: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const pageKey = themeShellVitrinKeyFromPath(pathname);
  if (!pageKey) return Promise.resolve(null);
  return resolveThemeShellSectionsContent(siteId, siteName, tenantSlug, pageKey, locale);
}
