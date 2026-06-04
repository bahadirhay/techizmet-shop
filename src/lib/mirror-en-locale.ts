import type { ShopLocale } from "@/lib/i18n/locale";
import {
  normalizeMirrorText,
  preserveNonTranslatable,
  restorePreserved,
} from "@/lib/mirror-html-locale";
import { MIRROR_TR_CATALOG } from "@/lib/mirror-tr-catalog";

let reversePairsCache: ReadonlyArray<readonly [string, string]> | null = null;

function getReversePairs(): ReadonlyArray<readonly [string, string]> {
  if (reversePairsCache) return reversePairsCache;
  const seen = new Set<string>();
  const pairs: Array<readonly [string, string]> = [];
  for (const [en, tr] of MIRROR_TR_CATALOG) {
    if (!tr.trim() || !en.trim() || tr === en) continue;
    if (seen.has(tr)) continue;
    seen.add(tr);
    pairs.push([tr, en]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  reversePairsCache = pairs;
  return reversePairsCache;
}

/** Tek satır / kısa metin — TR → EN */
export function applyMirrorEnReplacements(text: string): string {
  if (!text.trim()) return text;
  const { html: protectedHtml, chunks } = preserveNonTranslatable(text);
  let out = protectedHtml;
  for (const [tr, en] of getReversePairs()) {
    if (out.includes(tr)) out = out.split(tr).join(en);
  }
  return restorePreserved(out, chunks);
}

const EN_UI_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["Fiyat, düşükten yükseğe", "Price, low to high"],
  ["Fiyat, yüksekten düşüğe", "Price, high to low"],
  ["Alfabetik, A–Z", "Alphabetically, A-Z"],
  ["Alfabetik, Z–A", "Alphabetically, Z-A"],
  ["En çok satan", "Best selling"],
  ["Öne çıkan", "Featured"],
  ["Sırala", "Sort by"],
  ["KEŞFET", "EXPLORE"],
  ["TÜMÜNÜ KEŞFET", "EXPLORE ALL"],
  ["Keşfet", "Explore"],
  ["Tümünü keşfet", "Explore all"],
  ["Kategoriler", "Categories"],
  ["Koleksiyonlar", "Collections"],
  ["Tüm Cilt Bakımı", "All Skin Care"],
  ["Tüm Saç Bakımı", "All Hair Care"],
  ["Tüm Vücut Bakımı", "All Body Care"],
  ["En Çok Satanlar", "Best Sellers"],
  ["Ana Sayfa", "Home"],
  ["Hakkında", "About"],
  ["İletişim", "Contact"],
  ["Sepetim", "Cart"],
  ["Ara", "Search"],
  ["Giriş yap", "Log in"],
  ["Kayıt ol", "Sign up"],
];

function applyEnUiReplacements(text: string): string {
  let out = text;
  for (const [tr, en] of EN_UI_REPLACEMENTS) {
    if (out.includes(tr)) out = out.split(tr).join(en);
  }
  return out;
}

function applyEnReplacementsToText(text: string): string {
  return applyEnUiReplacements(applyMirrorEnReplacements(text));
}

/** Sunucu mirror HTML — şablonda kalan Türkçe (KEŞFET, kategori metinleri) */
export function applyMirrorEnHtml(html: string): string {
  const { html: protectedHtml, chunks } = preserveNonTranslatable(html);
  let out = normalizeMirrorText(protectedHtml);
  const pairs = [...getReversePairs(), ...EN_UI_REPLACEMENTS].sort((a, b) => b[0].length - a[0].length);
  for (const [tr, en] of pairs) {
    const key = normalizeMirrorText(tr);
    if (out.includes(key)) out = out.split(key).join(en);
  }
  return restorePreserved(out, chunks);
}

/** İngilizce vitrin — kalan Türkçe metinleri çevir (menü, EXPLORE, marquee) */
export function applyMirrorEnLocaleOverlay(doc: Document, locale: ShopLocale) {
  if (locale !== "en") return;

  const skip =
    "script, style, noscript, svg defs, .header--icons, list-set, [data-kn-no-translate]";

  doc.querySelectorAll(
    ".kn-nav-dropdown a, .kn-nav-dropdown span, .header--navigation-list a, .mobile-nav--link, .discover_data, .categories--text-inner, .marquee-text, .marquee--text, .marquee__text, [data-text], .filter-option-item a",
  ).forEach((el) => {
    if (el.closest(skip)) return;
    const t = el.textContent?.trim();
    if (!t) return;
    const next = applyEnReplacementsToText(t);
    if (next !== t) el.textContent = next;
  });

  doc.querySelectorAll("[data-text]").forEach((el) => {
    const d = el.getAttribute("data-text");
    if (!d) return;
    const next = applyEnReplacementsToText(d);
    if (next !== d) el.setAttribute("data-text", next);
  });

  doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p.text,p.text-medium,p.text-small,span.markers-text").forEach(
    (el) => {
      if (el.closest(skip)) return;
      const html = el.innerHTML;
      if (!html.trim() || html.includes("/theme/techizmet-shop/")) return;
      const next = applyEnReplacementsToText(html);
      if (next !== html) el.innerHTML = next;
    },
  );
}
