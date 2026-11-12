import "server-only";

import { MIRROR_SECTION_HIDDEN_ATTR } from "@/lib/mirror-home-overlay";

/**
 * Tema kabuğu (iframe'siz vitrin) çıktısının son rötuşları — yalnızca yayındaki sayfa HTML'i için.
 * Admin önizleme / iframe hattı bu adımdan geçmez; orada gizli bölümler DOM'da kalır.
 */

/** PDP alt bölüm ayarıyla gizlenen bölüm (bkz. product-page-bottom → setSectionVisible) */
const PDP_SECTION_HIDDEN_ATTR = "data-kn-pdp-hidden";

function isAdminHiddenSection(el: Element): boolean {
  return (
    el.getAttribute(MIRROR_SECTION_HIDDEN_ATTR) === "1" ||
    el.getAttribute(PDP_SECTION_HIDDEN_ATTR) === "1"
  );
}

/** Bölüm silinirken yerinde bırakılacak düğümler: ortak CSS ve özel eleman tanımları */
function isSharedAsset(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "link") {
    return (el.getAttribute("rel") || "").toLowerCase().includes("stylesheet");
  }
  if (tag === "script") {
    const type = (el.getAttribute("type") || "").toLowerCase();
    if (type === "application/json" || type === "application/ld+json") return false;
    if (el.getAttribute("src")) return true;
    return /customElements\.define\s*\(/.test(el.textContent || "");
  }
  return false;
}

/**
 * Admin'in gizlediği bölümleri HTML'den çıkarır (ziyaretçi zaten görmüyordu; arama motoru
 * demo metinlerini ve görsellerini okumasın, sayfa küçülsün).
 * Bölümün yüklediği stylesheet ve tema scriptleri, başka bölümler de kullanabildiği için korunur.
 */
export function removeAdminHiddenSections(main: Element): number {
  let removed = 0;
  for (const section of Array.from(main.querySelectorAll("section.kn-mirror-section"))) {
    if (section.parentElement !== main || !isAdminHiddenSection(section)) continue;
    const keep = Array.from(section.querySelectorAll("link, script")).filter(isSharedAsset);
    for (const node of keep) main.insertBefore(node, section);
    section.remove();
    removed += 1;
  }
  return removed;
}

function retagElement(el: Element, tagName: string, dropAttrs: string[] = []): Element {
  const next = el.ownerDocument.createElement(tagName);
  for (const attr of Array.from(el.attributes)) {
    if (dropAttrs.includes(attr.name)) continue;
    next.setAttribute(attr.name, attr.value);
  }
  while (el.firstChild) next.appendChild(el.firstChild);
  el.parentNode?.replaceChild(next, el);
  return next;
}

const SIZE_CLASS_RE = /(^|\s)(h[1-6])(\s|$)/;

/**
 * Sayfada H1 yoksa görünen sayfa başlığını (`.page--title`) H1 yapar.
 * Tema başlık boyutunu etiketle değil sınıfla da verir (`h2, .h2 { … }`); eski etiketin boyut
 * sınıfı eklenerek görünüm aynı kalır.
 */
export function promotePageTitleToH1(main: Element): boolean {
  if (main.querySelector("h1")) return false;
  const title = main.querySelector(".page--title");
  if (!title) return false;
  const oldTag = title.tagName.toLowerCase();
  const className = title.getAttribute("class") || "";
  const h1 = retagElement(title, "h1");
  if (/^h[2-6]$/.test(oldTag) && !SIZE_CLASS_RE.test(className)) {
    h1.setAttribute("class", `${className} ${oldTag}`.trim());
  }
  return true;
}

/**
 * PDP — ürün adını H1 yapar. Şablonda ürün adı kendi sayfasına giden bir bağlantıdır (`a.h5`).
 * Boyut sınıfı korunur; temanın başlık etiketlerine verdiği harf aralığı (bağlantıda yoktu)
 * sıfırlanır — böylece satır kırılımı dahil görünüm birebir aynı kalır.
 */
export function promoteProductTitleToH1(main: Element): boolean {
  if (main.querySelector("h1")) return false;
  const title =
    main.querySelector('section[id$="__main"] .product-title-heading') ??
    main.querySelector(".main--product-content-inner .product-title-heading") ??
    main.querySelector(".product-title-heading");
  if (!title) return false;
  const wasHeading = /^h[1-6]$/i.test(title.tagName);
  const h1 = retagElement(title, "h1", ["href", "aria-label"]);
  if (!wasHeading) {
    const style = (h1.getAttribute("style") || "").trim().replace(/;$/, "");
    h1.setAttribute("style", `${style ? `${style};` : ""}letter-spacing:normal`);
  }
  return true;
}

/**
 * PDP — şablondan kalan demo seçenekleri temizler (ürünün varyantı yokken blok zaten gizlidir):
 * "5ml / 10ml / 15ml" seçenek listesi, başlığı ve `<noscript>` içindeki dolar fiyatlı seçim kutusu.
 * `variants-set` elemanı ve JSON scriptleri yerinde kalır (tema motoru onları okur).
 */
export function stripTemplateVariantLeftovers(main: Element): void {
  for (const wrap of Array.from(main.querySelectorAll(".product--variants-options"))) {
    wrap.querySelectorAll("noscript").forEach((el) => el.remove());
    const hidden = /(^|;)\s*display\s*:\s*none\b/i.test(wrap.getAttribute("style") || "");
    if (!hidden) continue;
    wrap.querySelectorAll(".product--variants-list").forEach((list) => {
      list.innerHTML = "";
    });
    wrap.querySelectorAll(".product--variants-title").forEach((title) => {
      title.textContent = "";
    });
  }
}
