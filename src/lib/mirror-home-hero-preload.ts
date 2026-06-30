import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MIRROR_MOBILE_LCP_WIDTH, mirrorCdnImageUrl } from "@/lib/mirror-cdn-image";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function heroFromHtmlSnippet(html: string): string | null {
  const marker = html.indexOf("media_image");
  if (marker < 0) return null;
  const chunk = html.slice(marker, marker + 2500);
  const m = chunk.match(/data-original="([^"]+)"/i) ?? chunk.match(/src="([^"]+\.(?:jpe?g|png|webp))"/i);
  if (!m?.[1]) return null;
  return mirrorCdnImageUrl(m[1].replace(/&amp;/g, "&"), MIRROR_MOBILE_LCP_WIDTH);
}

/** Admin hero düzenlemesi varsa öncelikli */
function heroFromPageConfig(settings: ReturnType<typeof parseSiteSettings>): string | null {
  const config = getMirrorPageConfig(settings, "home");
  for (const edit of Object.values(config.elements ?? {})) {
    if (edit.kind !== "image") continue;
    const url = edit.imageUrl?.trim();
    if (!url) continue;
    return mirrorCdnImageUrl(url, MIRROR_MOBILE_LCP_WIDTH);
  }
  return null;
}

/** Parent <head> — iframe LCP hero ön yükleme (tasarım değişmez) */
export async function getMirrorHomeHeroPreloadHref(siteId: string, locale: "tr" | "en"): Promise<string | null> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
  const settings = parseSiteSettings(site?.settingsJson);
  const fromConfig = heroFromPageConfig(settings);
  if (fromConfig) return fromConfig;

  // Statik HTML fallback kaldırıldı — eski HTTrack snapshot'ından yanlış görsel gelmesin
  return null;
}
