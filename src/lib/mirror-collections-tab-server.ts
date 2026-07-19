import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCollectionsTabBilingualDefaults,
  enrichCollectionsTabsFromProductOptions,
} from "@/lib/mirror-collections-tab";
import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import { formatTry } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";
import { vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";

/** Sunucu — TR + EN mirror dosyalarından sekme varsayılanları */
export function extractCollectionsTabDefaults(pageKey: VitrinPageKey, sectionKey: string) {
  const trRel = vitrinMirrorFileRel(pageKey, "tr");
  const enRel = vitrinMirrorFileRel(pageKey, "en");
  const trPath = join(process.cwd(), "public", trRel);
  const enPath = join(process.cwd(), "public", enRel);
  const trHtml = existsSync(trPath) ? readFileSync(trPath, "utf8") : "";
  const enHtml = existsSync(enPath) ? readFileSync(enPath, "utf8") : "";
  return buildCollectionsTabBilingualDefaults(trHtml, enHtml, sectionKey);
}

/** Kayıt / canlı HTML — sekme ürünlerini mağaza DB fiyat ve başlıklarıyla güncelle */
export async function enrichMirrorPageConfigCollectionsTabs(
  siteId: string,
  config: MirrorPageConfig,
): Promise<MirrorPageConfig> {
  const hasTabs = Object.values(config.sections ?? {}).some((e) => (e?.collectionsTabs?.length ?? 0) > 0);
  if (!hasTabs) return config;

  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
  if (!rows.length) return config;

  const options = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl || p.images[0]?.url || null,
    priceLabel: formatTry(p.priceMinor),
  }));

  const sections = { ...config.sections };
  for (const [key, edit] of Object.entries(sections)) {
    if (!edit?.collectionsTabs?.length) continue;
    sections[key] = {
      ...edit,
      collectionsTabs: enrichCollectionsTabsFromProductOptions(edit.collectionsTabs, options),
    };
  }

  return { ...config, sections };
}
