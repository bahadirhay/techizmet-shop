import "server-only";

import { blogPostHref } from "@/lib/blog/blog-post-types";
import { notifyPublishedUrl } from "@/lib/seo/distribution-runner";
import { ensureIndexNowKey } from "@/lib/seo/indexnow";
import { submitIndexNowUrls, pingBingSitemap } from "@/lib/seo/indexnow";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

function toAbsolutePublicUrl(path: string): string {
  return `${getPublicSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Blog, ürün veya sayfa yayınlandığında arama motorlarına bildir (arka planda, hata yutulur) */
export function notifySearchEnginesForPath(path: string): void {
  notifySearchEnginesForPaths([path]);
}

/** Toplu URL bildirimi — IndexNow batch + Bing sitemap ping */
export function notifySearchEnginesForPaths(paths: string[]): void {
  const uniquePaths = [...new Set(paths.filter((p) => p?.trim()))];
  if (!uniquePaths.length) return;

  void (async () => {
    try {
      const site = await getDefaultSite();
      const settings = await getSiteSettings(site.id);
      const urls = uniquePaths.map(toAbsolutePublicUrl);

      if (urls.length === 1) {
        await notifyPublishedUrl(settings, urls[0]!);
        return;
      }

      const distribution = getSiteDistribution(settings);
      const key = ensureIndexNowKey(distribution);
      await submitIndexNowUrls(key, urls);
      await pingBingSitemap();
    } catch {
      /* indeksleme bildirimi kritik değil */
    }
  })();
}

export function notifySearchEnginesForBlogSlug(slug: string): void {
  notifySearchEnginesForPath(blogPostHref(slug));
}
