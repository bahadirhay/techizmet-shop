import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MIRROR_LCP_HERO_SIZES, MIRROR_LCP_SRCSET_WIDTHS, MIRROR_MOBILE_LCP_WIDTH, mirrorCdnImageUrl } from "@/lib/mirror-cdn-image";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function heroPreloadFromUrl(raw: string): { href: string; imageSrcSet: string; imageSizes: string } {
  const base = raw.split("?")[0]!;
  const href = mirrorCdnImageUrl(base, MIRROR_MOBILE_LCP_WIDTH);
  const imageSrcSet = MIRROR_LCP_SRCSET_WIDTHS.map((w) => `${mirrorCdnImageUrl(base, w)} ${w}w`).join(", ");
  return { href, imageSrcSet, imageSizes: MIRROR_LCP_HERO_SIZES };
}

function heroFromHtmlSnippet(html: string): { href: string; imageSrcSet: string; imageSizes: string } | null {
  const marker = html.indexOf("media_image");
  if (marker < 0) return null;
  const chunk = html.slice(marker, marker + 2500);
  const m = chunk.match(/data-original="([^"]+)"/i) ?? chunk.match(/src="([^"]+\.(?:jpe?g|png|webp))"/i);
  if (!m?.[1]) return null;
  return heroPreloadFromUrl(m[1].replace(/&amp;/g, "&"));
}

/** Admin hero düzenlemesi varsa öncelikli */
function heroFromPageConfig(settings: ReturnType<typeof parseSiteSettings>): { href: string; imageSrcSet: string; imageSizes: string } | null {
  const config = getMirrorPageConfig(settings, "home");

  const mediaGrid = config.sections?.media_grid_bGXVTf?.mediaGridItems?.[0]?.imageUrl?.trim();
  if (mediaGrid) return heroPreloadFromUrl(mediaGrid);

  for (const edit of Object.values(config.elements ?? {})) {
    if (edit.kind !== "image") continue;
    const url = edit.imageUrl?.trim();
    if (!url) continue;
    return heroPreloadFromUrl(url);
  }
  return null;
}

export type MirrorHomeHeroPreload = {
  href: string;
  imageSrcSet: string;
  imageSizes: string;
};

/** Parent <head> — iframe LCP hero ön yükleme (tasarım değişmez) */
export async function getMirrorHomeHeroPreloadHref(
  siteId: string,
  locale: "tr" | "en",
): Promise<MirrorHomeHeroPreload | null> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
  const settings = parseSiteSettings(site?.settingsJson);
  const fromConfig = heroFromPageConfig(settings);
  if (fromConfig) return fromConfig;

  const rel =
    locale === "en" ? "theme/techizmet-shop/mirror/index.html" : "theme/techizmet-shop/mirror/index-tr.html";
  try {
    const html = await readFile(join(process.cwd(), "public", rel), "utf8");
    return heroFromHtmlSnippet(html.slice(0, 400_000));
  } catch {
    return null;
  }
}
