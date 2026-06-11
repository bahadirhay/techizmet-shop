/**
 * Vitrin liste fiyatları — sunucuda HTML'e gömülür, istemci overlay sonrası tekrar uygular.
 */

import { parseHTML } from "linkedom";
import { formatTry } from "@/lib/format";

export type CatalogPriceEntry = { priceMinor: number; compareAtMinor: number | null };
export type CatalogPriceMap = Record<string, CatalogPriceEntry>;

const SCRIPT_ID = "kn-catalog-prices";

export function slugFromProductHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/products\/([^/?#]+)/i);
  return m?.[1]?.replace(/\.html$/i, "") ?? null;
}

export function formatCatalogPrice(entry: CatalogPriceEntry): string {
  return formatTry(entry.priceMinor);
}

export function injectCatalogPriceMapScript(html: string, map: CatalogPriceMap): string {
  if (!Object.keys(map).length) return html;
  const payload = JSON.stringify(map).replace(/</g, "\\u003c");
  const tag = `<script id="${SCRIPT_ID}" type="application/json">${payload}</script>`;
  if (html.includes(`id="${SCRIPT_ID}"`)) {
    return html.replace(
      new RegExp(`<script id="${SCRIPT_ID}"[^>]*>[\\s\\S]*?</script>`, "i"),
      tag,
    );
  }
  return html.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
}

export function readCatalogPriceMapFromDocument(doc: Document): CatalogPriceMap | null {
  const el = doc.getElementById(SCRIPT_ID);
  if (!el?.textContent?.trim()) return null;
  try {
    return JSON.parse(el.textContent) as CatalogPriceMap;
  } catch {
    return null;
  }
}

/** Tüm ürün linklerinden slug okuyup fiyat yazar — overlay sonrası da çalışır */
export function applyCatalogPricesToDocument(doc: Document, map: CatalogPriceMap) {
  const bySlug = new Map(Object.entries(map));

  doc.querySelectorAll('a[href*="/products/"]').forEach((link) => {
    const slug = slugFromProductHref(link.getAttribute("href"));
    if (!slug) return;
    const entry = bySlug.get(slug);
    if (!entry) return;

    const root =
      link.closest(
        ".collections-tab--menu-content-item-box, .product--card, .horizontal--product-card, .collections-tab--menu-content-item-inner",
      ) ?? link;

    const priceEl = root.querySelector(".product--actual-price");
    if (priceEl) priceEl.textContent = formatCatalogPrice(entry);

    const cutEl = root.querySelector(".product--cut-price");
    if (cutEl) {
      if (entry.compareAtMinor && entry.compareAtMinor > entry.priceMinor) {
        cutEl.textContent = formatTry(entry.compareAtMinor);
        (cutEl as HTMLElement).style.removeProperty("display");
      } else {
        (cutEl as HTMLElement).style.display = "none";
      }
    }

    const info =
      root.querySelector(".collections-tab--info") ??
      link.querySelector(".collections-tab--info");
    if (info) (info as HTMLElement).style.removeProperty("display");
  });
}

export function applyCatalogPricesToHtml(html: string, map: CatalogPriceMap): string {
  if (!Object.keys(map).length) return html;
  const withScript = injectCatalogPriceMapScript(html, map);
  const { document } = parseHTML(withScript);
  applyCatalogPricesToDocument(document, map);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
