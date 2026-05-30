/** Sunucu — mirror HTML üzerinde sayfa ayarları (iframe yüklemeden önce) */

import { parseHTML } from "linkedom";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  applyMirrorPageOverlay,
  hasMirrorPageEdits,
  type MirrorPageConfig,
} from "@/lib/mirror-home-overlay";

export function applyMirrorPageOverlayToHtml(
  html: string,
  config: MirrorPageConfig,
  locale: ShopLocale = "tr",
): string {
  if (!hasMirrorPageEdits(config)) {
    return html;
  }

  const { document } = parseHTML(html);
  applyMirrorPageOverlay(document, config, undefined, locale);
  document.documentElement.setAttribute("data-kn-overlay-server", "1");
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
