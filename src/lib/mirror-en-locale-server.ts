import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import { parseHTML } from "@/lib/linkedom-server";
import {
  applyMirrorEnHtml,
  applyMirrorEnLocaleOverlay,
} from "@/lib/mirror-en-locale";

/** Tam mirror HTML — string çeviri + DOM overlay (sunucu pipeline) */
export function applyMirrorEnLocaleToHtml(html: string, locale: ShopLocale = "en"): string {
  if (locale !== "en") return html;

  const out = applyMirrorEnHtml(html);
  const { document } = parseHTML(out);
  applyMirrorEnLocaleOverlay(document, "en");

  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "";
  const serialized = document.documentElement.outerHTML;
  return doctype ? `${doctype}\n${serialized}` : serialized;
}
