import { buildStoreHomePreset } from "@/lib/blocks/presets/techizmet-shop-home";
import { parseBlocks, type ShopBlock } from "@/lib/blocks/schema";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getPageBySlug } from "@/lib/site";

/** CMS blok modunda ana sayfa — admin’de kaydedilen home sayfası */
export async function getStoreHomepageBlocks(locale: ShopLocale): Promise<ShopBlock[]> {
  const page = await getPageBySlug("home");
  if (page?.blocks) {
    const parsed = parseBlocks(page.blocks);
    if (parsed.length > 0) return parsed;
  }
  return buildStoreHomePreset(locale);
}
