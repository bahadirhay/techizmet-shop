import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeBlogImageUrl } from "@/lib/blog/mirror-blog-inject";
import { resolveMirrorThemeFile } from "@/lib/mirror-cdn-assets";

const blogArticlePath = (slug: string) =>
  join(process.cwd(), "public/theme/techizmet-shop/mirror/blogs/news", `${slug}.html`);

const FEATURED_FALLBACK_BY_SLUG: Record<string, string> = {
  "top-natural-ingredients-for-glowing-skin-you-should-try":
    "/theme/techizmet-shop/cdn/shop/files/18af34f.jpg",
  "how-to-build-the-perfect-skincare-routine-for-your-skin-type":
    "/theme/techizmet-shop/cdn/shop/files/2a8bf8.jpg",
  "why-hydration-is-key-for-healthy-youthful-skin":
    "/theme/techizmet-shop/cdn/shop/files/6a9201.jpg",
  "seasonal-skincare-how-to-adjust-your-routine-year-round":
    "/theme/techizmet-shop/cdn/shop/files/13a642f.jpg",
  "the-benefits-of-switching-to-cruelty-free-skincare-products":
    "/theme/techizmet-shop/cdn/shop/files/76418.jpg",
  "the-truth-about-common-skincare-myths-debunked":
    "/theme/techizmet-shop/cdn/shop/files/18af34f.jpg",
};

export function resolveMirrorPublicAsset(publicPath: string): string | null {
  const norm = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const resolved = resolveMirrorThemeFile(norm);
  if (!resolved) return null;
  return `/${resolved.rel.replace(/\\/g, "/")}`;
}

function extractCdnPathsFromHtml(html: string): string[] {
  const paths = new Set<string>();
  const re = /\/theme\/techizmet-shop\/cdn\/shop\/(?:files|collections|articles)\/[^"'<\s]+/gi;
  for (const m of html.matchAll(re)) {
    paths.add(m[0].split("?")[0] ?? m[0]);
  }
  return [...paths];
}

export function resolveBlogImageFromArticleHtml(slug: string): string | null {
  const path = blogArticlePath(slug);
  if (!existsSync(path)) return null;

  const html = readFileSync(path, "utf8");
  const banner = html.match(
    /class="page--banner-img[\s\S]*?(?:data-original|src)="([^"]+)"/i,
  )?.[1];
  const candidates = [...(banner ? [banner] : []), ...extractCdnPathsFromHtml(html)];

  for (const raw of candidates) {
    const norm = normalizeBlogImageUrl(raw);
    const resolved = resolveMirrorPublicAsset(norm);
    if (resolved) return resolved;
  }
  return null;
}

function isDirectPublicImageUrl(url: string): boolean {
  return (
    url.startsWith("/uploads/") ||
    url.startsWith("/api/media/") ||
    url.startsWith("/brands/") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

/** Ana sayfa / DB — çalışan public URL (yalnızca sunucu) */
export function resolveBlogFeaturedImageUrl(slug: string, preferred?: string | null): string | null {
  if (preferred?.trim()) {
    const norm = normalizeBlogImageUrl(preferred);
    if (isDirectPublicImageUrl(norm)) return norm;
    const fromPreferred = resolveMirrorPublicAsset(norm);
    if (fromPreferred) return fromPreferred;
    if (norm.startsWith("/")) return norm;
  }

  const fromArticle = resolveBlogImageFromArticleHtml(slug);
  if (fromArticle) return fromArticle;

  const fallback = FEATURED_FALLBACK_BY_SLUG[slug];
  if (fallback) return resolveMirrorPublicAsset(fallback) ?? fallback;

  return null;
}
