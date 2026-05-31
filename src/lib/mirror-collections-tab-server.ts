import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCollectionsTabBilingualDefaults } from "@/lib/mirror-collections-tab";
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
