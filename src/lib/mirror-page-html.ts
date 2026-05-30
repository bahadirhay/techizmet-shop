import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getVitrinPage, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";

const themeRoot = join(process.cwd(), "public/theme/king-noor");

/** Sunucu — mirror HTML dosyası */
export function readMirrorPageHtml(pageKey: VitrinPageKey): string | null {
  const def = getVitrinPage(pageKey);
  if (!def) return null;
  const rel = def.mirrorFileRel("tr");
  const built = join(process.cwd(), "public", rel);
  if (existsSync(built)) return readFileSync(built, "utf8");
  const enRel = def.mirrorFileRel("en");
  const enBuilt = join(process.cwd(), "public", enRel);
  if (existsSync(enBuilt)) return readFileSync(enBuilt, "utf8");
  return null;
}

/** @deprecated — home */
export function readMirrorHomeHtml(): string | null {
  return readMirrorPageHtml("home");
}
