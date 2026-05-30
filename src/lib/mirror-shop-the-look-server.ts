import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildShopTheLookBilingualDefaults } from "@/lib/mirror-shop-the-look";
import { vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";

/** Sunucu — TR + EN mirror dosyalarından shop-the-look varsayılanları */
export function extractShopTheLookDefaults(pageKey: VitrinPageKey, sectionKey: string) {
  const trRel = vitrinMirrorFileRel(pageKey, "tr");
  const enRel = vitrinMirrorFileRel(pageKey, "en");
  const trPath = join(process.cwd(), "public", trRel);
  const enPath = join(process.cwd(), "public", enRel);
  const trHtml = existsSync(trPath) ? readFileSync(trPath, "utf8") : "";
  const enHtml = existsSync(enPath) ? readFileSync(enPath, "utf8") : "";
  return buildShopTheLookBilingualDefaults(trHtml, enHtml, sectionKey);
}
