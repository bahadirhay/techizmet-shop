import { serializeBlocks } from "@/lib/blocks/schema";
import { loadMirrorHomeBlocks } from "@/lib/mirror-home-blocks";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";

/** Mirror HTML değişince artırın — admin ana sayfa yeniden içe aktarılır */
export const MIRROR_HOME_IMPORT_VERSION = 1;

export function needsMirrorHomeImport(settings: SiteSettings): boolean {
  return settings.theme?.mirrorHomeImportVersion !== MIRROR_HOME_IMPORT_VERSION;
}

/** Gerçek vitrin (mirror index.html) → shopPage home blokları */
export async function importMirrorHomeToShopPage(siteId: string, pageId: string) {
  const blocks = loadMirrorHomeBlocks();
  await prisma.shopPage.update({
    where: { id: pageId, siteId },
    data: { blocks: serializeBlocks(blocks) },
  });
  return blocks;
}

export async function markMirrorHomeImported(siteId: string, publishToStorefront: boolean) {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  settings.theme = {
    ...settings.theme,
    mirrorHomeImportVersion: MIRROR_HOME_IMPORT_VERSION,
    /** Ana sayfa vitrin = mirror HTML; blok modu artık otomatik açılmaz */
  };
  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(settings) },
  });
  return settings;
}
