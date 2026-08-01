import "server-only";

import { revalidatePath } from "next/cache";
import { normalizeRobotsDisallowPaths } from "@/lib/seo/robots-disallow-paths";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

/** Bu yollar asla robots/sitemap’ten düşürülmez — içerik düzeltilir */
const NEVER_BLOCK_PATHS = new Set([
  "/",
  "/collections",
  "/collections/all",
  "/blogs/news",
  "/pages/about",
  "/pages/faq",
  "/pages/contact",
  "/pages/privacy-policy",
  "/pages/terms-of-service",
  "/pages/refund-policy",
  "/sokak-dostlari",
]);

const NEVER_BLOCK_PREFIXES = ["/collections/kopek-", "/collections/dogal-", "/collections/odul-"];

/** Her taramada robots’a eklenmesi gereken kabuk yolları */
export const REQUIRED_SEARCH_BLOCKS = [
  "/_mirror-prebuilt/",
  "/theme/techizmet-shop/mirror/",
] as const;

export function isProtectedIndexPath(path: string): boolean {
  const clean = path.split("?")[0] || path;
  if (NEVER_BLOCK_PATHS.has(clean)) return true;
  if (NEVER_BLOCK_PREFIXES.some((p) => clean.startsWith(p))) return true;
  if (clean.startsWith("/products/")) return true;
  if (clean.startsWith("/blogs/news/")) return true;
  return false;
}

/** Şablon / demo — Search Console’a düşmesin */
export function shouldBlockPathFromSearch(path: string): boolean {
  const clean = (path.split("?")[0] || path).trim();
  if (!clean.startsWith("/")) return false;
  if (isProtectedIndexPath(clean)) return false;
  if (clean.startsWith("/_mirror-prebuilt")) return true;
  if (clean.startsWith("/theme/")) return true;
  if (/\.html?$/i.test(clean)) return true;
  if (/mascara|skincare|serum|moisturizer|lipstick/i.test(clean)) return true;
  return false;
}

export function collectPathsToBlockFromFindings(
  findings: Array<{ source: string; path: string }>,
): string[] {
  const out = new Set<string>(REQUIRED_SEARCH_BLOCKS);
  for (const f of findings) {
    if (f.source !== "live") continue;
    if (!shouldBlockPathFromSearch(f.path)) continue;
    const clean = f.path.split("?")[0] || f.path;
    out.add(clean);
  }
  return [...out];
}

export function pathMatchesRobotsDisallow(pathname: string, disallowRules: string[]): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  for (const rule of disallowRules) {
    if (!rule || rule === "/") continue;
    if (path === rule) return true;
    if (rule.endsWith("/")) {
      if (path.startsWith(rule) || `${path}/` === rule) return true;
    } else if (path.startsWith(`${rule}/`)) {
      return true;
    }
  }
  return false;
}

export type SearchIndexBlockResult = {
  added: string[];
  robotsDisallowPaths: string[];
  updated: boolean;
};

/** robots.txt Disallow + sitemap dışlama listesini günceller */
export async function applySearchIndexBlocks(
  siteId: string,
  pathsToBlock: string[],
): Promise<SearchIndexBlockResult> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site yok");

  const settings = parseSiteSettings(site.settingsJson);
  const existing = normalizeRobotsDisallowPaths(settings.seo?.robotsDisallowPaths);
  const nextSet = new Set(existing);
  const added: string[] = [];

  for (const raw of [...REQUIRED_SEARCH_BLOCKS, ...pathsToBlock]) {
    const paths = normalizeRobotsDisallowPaths([raw]);
    for (const path of paths) {
      if (isProtectedIndexPath(path)) continue;
      if (nextSet.has(path)) continue;
      nextSet.add(path);
      added.push(path);
    }
  }

  const robotsDisallowPaths = [...nextSet];
  if (!added.length) {
    return { added: [], robotsDisallowPaths, updated: false };
  }

  const next: SiteSettings = {
    ...settings,
    seo: {
      ...settings.seo,
      robotsDisallowPaths,
    },
  };

  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");

  return { added, robotsDisallowPaths, updated: true };
}
