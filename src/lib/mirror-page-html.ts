import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getVitrinPage, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";

/** Sunucu — mirror HTML dosyası (önce tr, sonra en) */
export function readMirrorPageHtml(pageKey: VitrinPageKey): string | null {
  return readMirrorPageHtmlForLocale(pageKey, "tr") ?? readMirrorPageHtmlForLocale(pageKey, "en");
}

/** Sunucu — locale'e göre mirror HTML */
export function readMirrorPageHtmlForLocale(
  pageKey: VitrinPageKey,
  locale: ShopLocale,
): string | null {
  const def = getVitrinPage(pageKey);
  if (!def) return null;
  const primary = join(process.cwd(), "public", def.mirrorFileRel(locale));
  if (existsSync(primary)) return readFileSync(primary, "utf8");
  const fallback = locale === "tr" ? "en" : "tr";
  const alt = join(process.cwd(), "public", def.mirrorFileRel(fallback));
  if (existsSync(alt)) return readFileSync(alt, "utf8");
  return null;
}

/** @deprecated — home */
export function readMirrorHomeHtml(): string | null {
  return readMirrorPageHtml("home");
}

/** public/ altındaki mirror HTML — locale'e göre -tr dosyası */
export function readMirrorHtmlRelForLocale(rel: string, locale: ShopLocale): string | null {
  const normalized = rel.replace(/\\/g, "/");
  const localized =
    locale === "tr" && !normalized.endsWith("-tr.html")
      ? normalized.replace(/\.html$/i, "-tr.html")
      : normalized;
  const primary = join(process.cwd(), "public", localized);
  if (existsSync(primary)) return readFileSync(primary, "utf8");
  const fallback =
    locale === "tr"
      ? normalized.replace(/-tr\.html$/i, ".html")
      : normalized.replace(/\.html$/i, "-tr.html");
  const alt = join(process.cwd(), "public", fallback);
  if (existsSync(alt)) return readFileSync(alt, "utf8");
  return null;
}
