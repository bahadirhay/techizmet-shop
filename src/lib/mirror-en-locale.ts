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
export function localizeMirrorTextForLocale(text: string, locale: ShopLocale): string {
  if (locale !== "en" || !text.trim()) return text;
  return applyEnReplacementsToText(text);
}

/** HTML parçası — TR → EN (etiketler korunur) */
export function localizeMirrorHtmlChunkForLocale(html: string, locale: ShopLocale): string {
  if (locale !== "en" || !html.trim()) return html;
  return applyMirrorEnHtml(html);
}

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
  // —— Pet shop — ürün adları (uzun önce) ——
  [
    "Kurutulmuş Dana Akciğer Köpek Ödül Maması %100 Doğal 50 gr",
    "Freeze-Dried Beef Lung Dog Treat 100% Natural 50 g",
  ],
  [
    "Kurutulmuş Dana Gırtlak Köpek Ödül Maması %100 Doğal 80 gr",
    "Freeze-Dried Beef Trachea Dog Treat 100% Natural 80 g",
  ],
  [
    "Kurutulmuş Deve Derisi Köpek Ödül Maması %100 Doğal 100 gr",
    "Freeze-Dried Camel Hide Dog Treat 100% Natural 100 g",
  ],
  [
    "Kurutulmuş Kuzu Paça Köpek Ödül Maması %100 Doğal 2 Adet",
    "Freeze-Dried Lamb Trotter Dog Treat 100% Natural 2 pcs",
  ],
  [
    "Kurutulmuş Tavuk Ayağı Köpek Ödül Maması %100 Doğal 100 gr",
    "Freeze-Dried Chicken Feet Dog Treat 100% Natural 100 g",
  ],
  [
    "Kurutulmuş Dana Akciğer Köpek Ödül Maması %100 Doğal",
    "Freeze-Dried Beef Lung Dog Treat 100% Natural",
  ],
  [
    "Kurutulmuş Dana Gırtlak Köpek Ödül Maması %100 Doğal",
    "Freeze-Dried Beef Trachea Dog Treat 100% Natural",
  ],
  [
    "Kurutulmuş Deve Derisi Köpek Ödül Maması %100 Doğal",
    "Freeze-Dried Camel Hide Dog Treat 100% Natural",
  ],
  [
    "Kurutulmuş Kuzu Paça Köpek Ödül Maması %100 Doğal",
    "Freeze-Dried Lamb Trotter Dog Treat 100% Natural",
  ],
  [
    "Kurutulmuş Tavuk Ayağı Köpek Ödül Maması %100 Doğal",
    "Freeze-Dried Chicken Feet Dog Treat 100% Natural",
  ],
  [
    "Türkiye'de Üretilen, Avrupa'da Sevilen Doğal Köpek Ödülleri",
    "Natural Dog Treats Made in Turkey, Loved in Europe",
  ],
  [
    'Türkiye\'de Üretilen <span class="markers-text accent-font no-markers">Doğal Köpek Ödülleri</span>',
    'Made in Turkey <span class="markers-text accent-font no-markers">Natural Dog Treats</span>',
  ],
  [
    "Köpeklerinizin sağlığı bizim için öncelik. Her ürünümüz özenle seçilmiş doğal malzemelerden üretilir.",
    "Your dogs' health is our priority. Every product is made from carefully selected natural ingredients.",
  ],
  [
    "Türkiye'de en yüksek standartlarda üretim yapıyor, Avrupa'ya ihracat kalitesinde ürünler sunuyoruz.",
    "We manufacture to the highest standards in Turkey, offering export-quality products.",
  ],
  ["Doğal Köpek Ödül Mamaları", "Natural Dog Treats"],
  ["Doğal Köpek Ödülleri", "Natural Dog Treats"],
  ["Köpek Ödül Mamaları", "Dog Treats"],
  ["Köpek Ödül Maması", "Dog Treat"],
  ["Kurutulmuş Dana Akciğer", "Freeze-Dried Beef Lung"],
  ["Kurutulmuş Dana Gırtlak", "Freeze-Dried Beef Trachea"],
  ["Kurutulmuş Deve Derisi", "Freeze-Dried Camel Hide"],
  ["Kurutulmuş Kuzu Paça", "Freeze-Dried Lamb Trotter"],
  ["Kurutulmuş Tavuk Ayağı", "Freeze-Dried Chicken Feet"],
  ["Dana Akciğer", "Beef Lung"],
  ["Dana Gırtlak", "Beef Trachea"],
  ["Deve Derisi", "Camel Hide"],
  ["Kuzu Paça", "Lamb Trotter"],
  ["Tavuk Ayağı", "Chicken Feet"],
  ["Kurutulmuş", "Freeze-Dried"],
  ["%100 Doğal", "100% Natural"],
  ["2 Adet", "2 pcs"],
  [" gr", " g"],
  [
    "Yıllardır Avrupa pazarında satılan doğal köpek ödül mamaları ürünlerimiz, binlerce mutlu müşteri tarafından onaylandı.",
    "Our natural dog treats have been sold in European markets for years, trusted by thousands of happy customers.",
  ],
  [
    "Yıllardır Avrupa pazarında satılan ürünlerimiz, binlerce mutlu müşteri tarafından onaylandı.",
    "Our products have been sold in European markets for years, trusted by thousands of happy customers.",
  ],
  [
    "Katkı maddesi, koruyucu veya yapay lezzet içermeyen tamamen doğal köpek ödül maması ürünler.",
    "Completely natural dog treats with no additives, preservatives, or artificial flavors.",
  ],
  [
    "Katkı maddesi, koruyucu veya yapay lezzet içermeyen tamamen doğal ürünler.",
    "Completely natural products with no additives, preservatives, or artificial flavors.",
  ],
  [
    "Tüm ürünlerimiz kalite kontrol süreçlerinden geçerek size ulaşır.",
    "All our products reach you after passing quality control processes.",
  ],
  ["Avrupa'da Test Edildi", "Tested in Europe"],
  ["Türkiye'de Üretim", "Made in Turkey"],
  ["Adres : Osmaniye, Sugözü Sk. No:5, 34146 Bakırköy/İstanbul, Türkiye", "Address: Osmaniye, Sugözü Sk. No:5, 34146 Bakırköy/Istanbul, Turkey"],
  ["Adres:", "Address:"],
  ["Neden Anatolian Paw?", "Why Anatolian Paw?"],
  ["Türkiye'de Üretilen", "Made in Turkey"],
  ["Türkiye'de Üretim", "Made in Turkey"],
  // —— Kargo / duyuru ——
  ["700 TL üzeri siparişlerde ücretsiz kargo", "Free shipping on orders over 700 TL"],
  ["300 TL üzeri siparişlerde ücretsiz kargo", "Free shipping on orders over 300 TL"],
  ["üzeri siparişlerde ücretsiz kargo", "free shipping on orders over"],
  ["ücretsiz kargo", "free shipping"],
  // —— Navigasyon / genel UI ——
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
  ["Çok Satanlar", "Best Sellers"],
  ["Ana Sayfa", "Home"],
  ["Hakkımızda", "About Us"],
  ["Hakkında", "About"],
  ["İletişim", "Contact"],
  ["Sepetim", "Cart"],
  ["Sepete ekle", "Add to cart"],
  ["Sepete Ekle", "Add to Cart"],
  ["Ara", "Search"],
  ["Arama", "Search"],
  ["Giriş yap", "Log in"],
  ["Kayıt ol", "Sign up"],
  ["Menü", "Menu"],
  ["Yukarı", "Back to top"],
  ["Yukarı çık", "Back to top"],
  ["Hemen Al!", "Shop Now!"],
  ["Hemen Al", "Buy Now"],
  ["Gizlilik Politikası", "Privacy Policy"],
  ["Kargo Politikası", "Shipping Policy"],
  ["Mesafeli Satış Sözleşmesi", "Distance Sales Agreement"],
  ["İade Politikası", "Return Policy"],
  ["Kullanım Şartları", "Terms of Use"],
  ["Hizmet Şartları", "Terms of Service"],
  ["Ürün Açıklaması", "Product Description"],
  ["Özellikler", "Features"],
  ["Nasıl Kullanılır", "How to Use"],
  ["Yorumlar", "Reviews"],
  ["Benzer Ürünler", "Related Products"],
  ["Stokta", "In stock"],
  ["Tükendi", "Sold out"],
  ["Miktar", "Quantity"],
  ["değerlendirme", "review"],
  ["değerlendirmeler", "reviews"],
  ["Sokak Dostları", "Street Friends"],
  ["Mama Fonu", "Food Fund"],
  ["Sokak Dostları Mama Fonu", "Street Friends Food Fund"],
  // —— Blog ——
  ["Devamını oku", "Read more"],
  ["Köpek Bakımı Rehberi", "Dog Care Guide"],
  [
    "Sevimli dostlarınız için uzman tavsiyeleri, beslenme ipuçları ve eğitim rehberleri.",
    "Expert tips, nutrition advice, and training guides for your beloved companions.",
  ],
  ["Ürün Bilgisi", "Product Info"],
  ["Sağlık", "Health"],
  ["Eğitim", "Training"],
  ["Blog", "Blog"],
];

function applyEnUiReplacements(text: string): string {
  let out = text;
  for (const [tr, en] of EN_UI_REPLACEMENTS) {
    if (out.includes(tr)) out = out.split(tr).join(en);
  }
  return out;
}

export function applyEnReplacementsToText(text: string): string {
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

const EN_OVERLAY_TEXT_SELECTORS = [
  ".kn-nav-dropdown a",
  ".kn-nav-dropdown span",
  ".header--navigation-list a",
  ".header--menu-link",
  ".mobile-nav--link",
  ".discover_data",
  ".categories--text-inner",
  ".marquee-text",
  ".marquee--text",
  ".marquee__text",
  "[data-text]",
  ".filter-option-item a",
  ".announcement-bar--text",
  ".product--title",
  ".product-title-heading",
  ".product-accordion--heading-text",
  ".footer--menu-link",
  ".section--heading",
  ".section--description",
  ".page--title",
  ".page--desc",
  ".blog--title",
  ".blog--desc",
  ".button--text",
  ".media-content-heading",
  ".kn-cms-text",
  "label",
  "button",
  "th",
  "td",
].join(", ");

function translateElementText(el: Element, skip: string) {
  if (el.closest(skip)) return;
  const t = el.textContent?.trim();
  if (!t) return;
  const next = applyEnReplacementsToText(t);
  if (next !== t) el.textContent = next;
}

function translateElementHtml(el: Element, skip: string) {
  if (el.closest(skip)) return;
  const html = el.innerHTML;
  if (!html.trim() || html.includes("/theme/techizmet-shop/")) return;
  const next = applyEnReplacementsToText(html);
  if (next !== html) el.innerHTML = next;
}

function translateAttributes(el: Element, skip: string) {
  if (el.closest(skip)) return;
  for (const attr of ["aria-label", "title", "alt", "placeholder"]) {
    const val = el.getAttribute(attr);
    if (!val?.trim()) continue;
    const next = applyEnReplacementsToText(val);
    if (next !== val) el.setAttribute(attr, next);
  }
}

/** İngilizce vitrin — kalan Türkçe metinleri çevir (menü, ürün, CMS, duyuru) */
export function applyMirrorEnLocaleOverlay(doc: Document, locale: ShopLocale) {
  if (locale !== "en") return;

  const skip =
    "script, style, noscript, svg defs, .header--icons, list-set, [data-kn-no-translate]";

  doc.querySelectorAll(EN_OVERLAY_TEXT_SELECTORS).forEach((el) => {
    translateElementText(el, skip);
  });

  doc.querySelectorAll("[data-text]").forEach((el) => {
    const d = el.getAttribute("data-text");
    if (!d) return;
    const next = applyEnReplacementsToText(d);
    if (next !== d) el.setAttribute("data-text", next);
  });

  doc.querySelectorAll(
    "h1,h2,h3,h4,h5,h6,p.text,p.text-medium,p.text-small,p,span.markers-text,li,figcaption",
  ).forEach((el) => {
    translateElementHtml(el, skip);
  });

  doc.querySelectorAll("a,button,img,input,textarea,select").forEach((el) => {
    translateAttributes(el, skip);
  });
}
