/** Müşteri yorumları — testimonial bölümü */

import { isElementNode, isImageNode } from "@/lib/mirror-dom-node";
import type { ShopLocale } from "@/lib/i18n/locale";

export type TestimonialItemEdit = {
  blockId: string;
  authorTr: string;
  authorEn: string;
  quoteTr: string;
  quoteEn: string;
  imageUrl?: string;
};

function sliceSectionHtml(html: string, sectionKey: string): string {
  const esc = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<section[^>]*__${esc}"[\\s\\S]*?</section>`, "i"))?.[0] ?? "";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractTestimonialFromHtml(html: string, sectionKey: string): TestimonialItemEdit[] {
  const block = sliceSectionHtml(html, sectionKey);
  if (!block) return [];
  const items: TestimonialItemEdit[] = [];
  const idRe = /\bid="(block-testimonial[^"]+)"/g;
  const ids: string[] = [];
  let idm: RegExpExecArray | null;
  while ((idm = idRe.exec(block))) ids.push(idm[1]);

  for (let i = 0; i < ids.length; i += 1) {
    const start = block.indexOf(`id="${ids[i]!}"`);
    const end = i + 1 < ids.length ? block.indexOf(`id="${ids[i + 1]!}"`) : block.length;
    const chunk = block.slice(start, end);
    const author = stripHtml(chunk.match(/class="author-title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ?? "");
    const quote = stripHtml(chunk.match(/class="testimonial--desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const imageUrl =
      chunk.match(/data-original="([^"]+)"/i)?.[1]?.split("?")[0] ??
      chunk.match(/\ssrc="(\/theme\/techizmet-shop\/[^"?]+)/i)?.[1] ??
      chunk.match(/\ssrc="(\/uploads\/[^"?]+)/i)?.[1] ??
      chunk.match(/\ssrc="(\/api\/media\/[^"?]+)/i)?.[1];
    if (!author && !quote && !imageUrl) continue;
    items.push({
      blockId: ids[i]!,
      authorTr: author,
      authorEn: author,
      quoteTr: quote,
      quoteEn: quote,
      imageUrl,
    });
  }
  return items;
}

export function mergeTestimonialEdits(
  defaults: TestimonialItemEdit[] | undefined,
  edits: TestimonialItemEdit[] | undefined,
): TestimonialItemEdit[] {
  if (!defaults?.length) return edits ?? [];
  if (!edits?.length) return defaults;
  return defaults.map((d, i) => {
    const e = edits.find((x) => x.blockId === d.blockId) ?? edits[i];
    if (!e) return d;
    return {
      ...d,
      authorTr: e.authorTr?.trim() || d.authorTr,
      authorEn: e.authorEn?.trim() || d.authorEn,
      quoteTr: e.quoteTr?.trim() || d.quoteTr,
      quoteEn: e.quoteEn?.trim() || d.quoteEn,
      imageUrl: e.imageUrl ?? d.imageUrl,
    };
  });
}

export function resolveTestimonialVisibleCount(
  visibleCount: number | undefined,
  itemCount: number,
): number {
  if (itemCount <= 0) return 0;
  if (visibleCount == null || !Number.isFinite(visibleCount) || visibleCount <= 0) return itemCount;
  return Math.min(Math.max(1, Math.floor(visibleCount)), itemCount);
}

export function applyTestimonialVisibility(sectionEl: Element, visibleCount?: number) {
  const cards = [
    ...sectionEl.querySelectorAll('.testimonial--item[id^="block-testimonial"]'),
  ];
  if (!cards.length) return;
  const limit = resolveTestimonialVisibleCount(visibleCount, cards.length);
  cards.forEach((card, i) => {
    if (!isElementNode(card)) return;
    if (i >= limit) {
      // DOM'dan silmek yerine gizle — admin sayıyı artırırsa client geri açabilir
      card.setAttribute("data-kn-hidden", "1");
      card.style.setProperty("display", "none", "important");
    } else {
      card.style.removeProperty("display");
      card.removeAttribute("data-kn-hidden");
    }
  });
  applyTestimonialSwiperFit(sectionEl, limit);
}

type TestimonialSwiperCfg = {
  slidesPerView?: number | string;
  centeredSlides?: boolean;
  watchOverflow?: boolean;
  allowTouchMove?: boolean;
  freeMode?: { enabled?: boolean; [key: string]: unknown };
  breakpoints?: Record<string, TestimonialSwiperCfg>;
  scrollbar?: unknown;
};

function countVisibleTestimonialSlides(sectionEl: Element): number {
  return [...sectionEl.querySelectorAll('.testimonial--item[id^="block-testimonial"]')].filter(
    (card) =>
      isElementNode(card) &&
      card.getAttribute("data-kn-hidden") !== "1" &&
      card.style.display !== "none",
  ).length;
}

function readOriginalSwiperConfig(swiperEl: Element): TestimonialSwiperCfg {
  const cached = swiperEl.getAttribute("data-kn-swiper-original");
  if (cached) {
    try {
      return JSON.parse(cached) as TestimonialSwiperCfg;
    } catch {
      /* fall through */
    }
  }
  const raw = swiperEl.getAttribute("data-swiper") ?? "{}";
  swiperEl.setAttribute("data-kn-swiper-original", raw);
  try {
    return JSON.parse(raw) as TestimonialSwiperCfg;
  } catch {
    return {};
  }
}

function slidesPerViewNumber(cfg: TestimonialSwiperCfg | undefined): number {
  const spv = cfg?.slidesPerView;
  return typeof spv === "number" && Number.isFinite(spv) ? spv : 1;
}

function maxDesktopSlidesPerView(cfg: TestimonialSwiperCfg): number {
  let max = slidesPerViewNumber(cfg);
  for (const bp of Object.values(cfg.breakpoints ?? {})) {
    max = Math.max(max, slidesPerViewNumber(bp));
  }
  return max;
}

function cloneSwiperCfg(cfg: TestimonialSwiperCfg): TestimonialSwiperCfg {
  return JSON.parse(JSON.stringify(cfg)) as TestimonialSwiperCfg;
}

function patchBreakpointForFit(bp: TestimonialSwiperCfg, visible: number) {
  const spv = slidesPerViewNumber(bp);
  if (visible > spv) return;
  bp.slidesPerView = "auto";
  bp.centeredSlides = false;
  bp.freeMode = {
    ...(typeof bp.freeMode === "object" && bp.freeMode ? bp.freeMode : {}),
    enabled: false,
  };
  bp.scrollbar = false;
  bp.allowTouchMove = false;
}

/** Az kart ekrana sığıyorsa ortala; taşarsa normal kaydırma */
export function applyTestimonialSwiperFit(sectionEl: Element, visibleCount?: number) {
  const swiperEl = sectionEl.querySelector(".testimonial--outer[data-swiper]");
  if (!swiperEl) return;

  const visible =
    visibleCount != null ? visibleCount : countVisibleTestimonialSlides(sectionEl);
  if (visible <= 0) return;

  const original = readOriginalSwiperConfig(swiperEl);
  const cfg = cloneSwiperCfg(original);
  const maxSpv = maxDesktopSlidesPerView(original);
  const fitsWide = visible <= maxSpv;

  sectionEl.classList.toggle("kn-testimonial-fits", fitsWide);
  if (isElementNode(sectionEl)) {
    if (fitsWide) {
      sectionEl.style.setProperty("--kn-testimonial-visible", String(visible));
    } else {
      sectionEl.style.removeProperty("--kn-testimonial-visible");
    }
  }

  if (fitsWide) {
    cfg.watchOverflow = true;
    if (cfg.breakpoints) {
      for (const bp of Object.values(cfg.breakpoints)) {
        patchBreakpointForFit(bp, visible);
      }
    }
  }

  swiperEl.setAttribute("data-swiper", JSON.stringify(cfg, null, 2));
  syncLiveTestimonialSwiper(swiperEl, cfg, original, fitsWide, visible);
  const doc = sectionEl.ownerDocument;
  if (doc) ensureTestimonialFitRuntime(doc);
}

type SwiperInstance = {
  destroyed?: boolean;
  params: TestimonialSwiperCfg & { breakpoints?: Record<string, TestimonialSwiperCfg> };
  update: () => void;
  isLocked?: () => boolean;
};

function resolveActiveSwiperCfg(
  cfg: TestimonialSwiperCfg,
  viewportWidth: number,
): TestimonialSwiperCfg {
  let active = cfg;
  if (!cfg.breakpoints) return active;
  const keys = Object.keys(cfg.breakpoints)
    .map((k) => Number.parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  for (const key of keys) {
    if (viewportWidth >= key && cfg.breakpoints[String(key)]) {
      active = { ...active, ...cfg.breakpoints[String(key)] };
    }
  }
  return active;
}

function syncLiveTestimonialSwiper(
  swiperEl: Element,
  cfg: TestimonialSwiperCfg,
  original: TestimonialSwiperCfg,
  fitsWide: boolean,
  visible: number,
) {
  const host = swiperEl as HTMLElement & { swiper?: SwiperInstance };
  const sw = host.swiper;
  if (!sw || sw.destroyed) return;

  sw.params.watchOverflow = cfg.watchOverflow;
  if (cfg.breakpoints) {
    sw.params.breakpoints = cloneSwiperCfg(cfg).breakpoints;
  }
  if (typeof window !== "undefined") {
    const w = window.innerWidth;
    const active = resolveActiveSwiperCfg(cfg, w);
    const activeOriginal = resolveActiveSwiperCfg(original, w);
    const maxSpv = slidesPerViewNumber(activeOriginal);

    if (fitsWide && w >= 1025 && visible > 0 && visible <= maxSpv) {
      sw.params.centeredSlides = false;
      sw.params.slidesPerView = "auto";
      sw.params.freeMode = {
        ...(typeof sw.params.freeMode === "object" ? sw.params.freeMode : {}),
        enabled: false,
      };
      sw.params.allowTouchMove = false;
    } else {
      sw.params.centeredSlides = active.centeredSlides ?? false;
      sw.params.slidesPerView = active.slidesPerView ?? 1;
      sw.params.freeMode = active.freeMode;
      sw.params.allowTouchMove = active.allowTouchMove ?? true;
    }
  }

  sw.update();
}

const TESTIMONIAL_FIT_SCRIPT_ID = "kn-testimonial-fit-script";

function ensureTestimonialFitRuntime(doc: Document) {
  if (doc.getElementById(TESTIMONIAL_FIT_SCRIPT_ID)) return;
  const script = doc.createElement("script");
  script.id = TESTIMONIAL_FIT_SCRIPT_ID;
  script.textContent = `(function(){function hideNav(el){var sec=el.closest(".section-testimonial");if(!sec)return;sec.querySelectorAll(".swiper-button-prev,.swiper-button-next,.swiper-scrollbar,.swiper--custom-buttons").forEach(function(n){n.style.display="none";});}function apply(){document.querySelectorAll(".section-testimonial.kn-testimonial-fits .testimonial--outer.swiper").forEach(function(el){var sw=el.swiper;if(!sw||sw.destroyed)return;if(window.innerWidth<1025)return;try{sw.params.centeredSlides=false;sw.params.slidesPerView="auto";sw.params.freeMode=Object.assign({},sw.params.freeMode||{},{enabled:false});sw.params.allowTouchMove=false;sw.update();hideNav(el);}catch(e){}});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){apply();setTimeout(apply,400);setTimeout(apply,1200);});else{apply();setTimeout(apply,400);setTimeout(apply,1200);}window.addEventListener("resize",function(){clearTimeout(window.__knTstFitT);window.__knTstFitT=setTimeout(apply,120);});})();`;
  (doc.head ?? doc.body)?.appendChild(script);
}

function authorText(item: TestimonialItemEdit, locale: ShopLocale): string | null {
  if (locale === "tr") return item.authorTr || item.authorEn || null;
  // EN: authorEn boşsa orijinal HTML'i koru (null döndür = güncelleme)
  return item.authorEn?.trim() || null;
}

function quoteText(item: TestimonialItemEdit, locale: ShopLocale): string | null {
  if (locale === "tr") return item.quoteTr || item.quoteEn || null;
  // EN: quoteEn boşsa orijinal HTML'i koru (null döndür = güncelleme)
  return item.quoteEn?.trim() || null;
}

function applyAuthorImage(card: Element, imageUrl: string) {
  const base = imageUrl.split("?")[0] ?? imageUrl;
  const bust = base.includes("?") ? base : `${base}?kn=1`;
  card.querySelectorAll("img").forEach((img) => {
    if (!isImageNode(img)) return;
    img.src = bust;
    img.setAttribute("data-original", base);
    img.setAttribute("data-src", base);
    img.classList.remove("lazyload");
    img.classList.add("lazyloaded");
    img.removeAttribute("srcset");
  });
}

export function applyTestimonialToSection(
  sectionEl: Element,
  items: TestimonialItemEdit[],
  locale: ShopLocale = "tr",
  visibleCount?: number,
) {
  for (const item of items) {
    const card = sectionEl.querySelector(`#${item.blockId}`);
    if (!card) continue;
    const authorEl = card.querySelector(".author-title");
    const quoteEl = card.querySelector(".testimonial--desc");
    const author = authorText(item, locale);
    const quote = quoteText(item, locale);
    if (authorEl && author !== null) authorEl.textContent = author;
    if (quoteEl && quote !== null) quoteEl.textContent = quote;
    if (item.imageUrl?.trim()) {
      applyAuthorImage(card, item.imageUrl.trim());
    }
  }
  applyTestimonialVisibility(sectionEl, visibleCount);
}
