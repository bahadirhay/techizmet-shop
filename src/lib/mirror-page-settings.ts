import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import type { SiteSettings } from "@/lib/site-settings";
import type { VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { loadMirrorPageSectionsCatalog } from "@/lib/mirror-page-sections";

export function getMirrorPageConfig(
  settings: SiteSettings,
  pageKey: VitrinPageKey,
): MirrorPageConfig {
  const catalog = loadMirrorPageSectionsCatalog(pageKey);
  const defaultOrder = catalog.map((s) => s.key);

  const fromRegistry = settings.theme?.mirrorPages?.[pageKey];
  const fromLegacyHome =
    pageKey === "home" ? settings.theme?.mirrorHome : undefined;
  const saved = fromRegistry ?? fromLegacyHome;

  const order =
    saved?.order?.filter((k) => catalog.some((c) => c.key === k)) ?? [...defaultOrder];
  for (const k of defaultOrder) {
    if (!order.includes(k)) order.push(k);
  }

  return {
    order,
    sections: saved?.sections ?? {},
    elements: saved?.elements ?? {},
    customBlocks: saved?.customBlocks,
    contactFormCentered: saved?.contactFormCentered,
  };
}

export function isVitrinPagePublished(
  settings: SiteSettings,
  pageKey: VitrinPageKey,
): boolean {
  const meta = settings.theme?.mirrorPagesMeta?.[pageKey];
  if (meta?.published === false) return false;
  return true;
}
