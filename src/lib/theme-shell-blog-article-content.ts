import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { buildMirrorHtml } from "@/lib/mirror-html-build";
import {
  blogArticleMirrorFileRel,
  resolveMirrorBlogArticleTemplateSlug,
} from "@/lib/mirror-html-path";
import {
  buildThemeShellMainContentFromHtml,
  type ThemeShellSectionsContent,
} from "@/lib/theme-shell-sections-content";

async function buildThemeShellBlogArticleContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  const templateSlug = resolveMirrorBlogArticleTemplateSlug(slug);
  if (!templateSlug) return null;

  const normalized = blogArticleMirrorFileRel(templateSlug, locale);
  const html = await buildMirrorHtml({
    normalized,
    locale,
    siteId,
    siteName,
    tenantSlug,
    blogSlug: slug,
  });
  return buildThemeShellMainContentFromHtml(html);
}

/** Blog yazısı — iframe ile aynı DB içerik + mirror şablon */
export function resolveThemeShellBlogArticleContent(
  siteId: string,
  siteName: string,
  tenantSlug: string,
  slug: string,
  locale: ShopLocale,
): Promise<ThemeShellSectionsContent | null> {
  return unstable_cache(
    () => buildThemeShellBlogArticleContent(siteId, siteName, tenantSlug, slug, locale),
    ["theme-shell-blog-article-v1", siteId, tenantSlug, slug, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-blog"],
    },
  )();
}
