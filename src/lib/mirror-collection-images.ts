import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MIRROR_COLLECTION_LIST } from "@/lib/catalog/mirror-catalog";

const themeRoot = join(process.cwd(), "public/theme/king-noor/mirror/collections");

function readCollectionsIndexHtml(): string | null {
  for (const name of ["index-tr.html", "index.html"]) {
    const p = join(themeRoot, name);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  return null;
}

/** Katalogdaki vitrin kart görseli */
export function getMirrorCollectionImageFromCatalog(slug: string): string | null {
  const row = MIRROR_COLLECTION_LIST.find((c) => c.slug === slug);
  return row?.image ?? null;
}

/** /collections index HTML — yalnızca vitrin kartları (.collection--card-item) */
export function extractCollectionCardImage(html: string, slug: string): string | null {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cardRe = /<div class="collection--card-item"[\s\S]*?<\/div>\s*<\/div>/gi;
  for (const block of html.matchAll(cardRe)) {
    const card = block[0];
    if (!new RegExp(`href="/collections/${esc}"`, "i").test(card)) continue;
    const img = card.match(
      /class="collection--card-image"[\s\S]*?(?:data-original|src)="([^"]+)"/i,
    );
    if (img?.[1]) return img[1].replace(/&amp;/g, "&").split("?")[0] ?? null;
  }
  return null;
}

export function getMirrorCollectionImage(slug: string): string | null {
  const fromCatalog = getMirrorCollectionImageFromCatalog(slug);
  if (fromCatalog) return fromCatalog;

  const html = readCollectionsIndexHtml();
  if (!html) return null;
  return extractCollectionCardImage(html, slug);
}
