import {
  PRODUCT_GALLERY_SWIPER,
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  PRODUCT_IMAGE_THUMB,
  productImageMediaRatioStyle,
} from "@/lib/product-image-spec";
import { ensureMirrorProductImageStyles } from "@/lib/mirror-product-image-inject";
import { resolvePublicMediaUrl } from "@/lib/product-media";
import type { BundleComponentSnapshot } from "@/lib/product-bundle";
import { isAnchorNode, isElementNode, isImageNode, isInputNode } from "@/lib/mirror-dom-node";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import { injectMirrorProductCommerceHtml } from "@/lib/mirror-product-commerce";
import type { ProductContentOverlay } from "@/lib/mirror-product-overlay";
import { applyProductContentOverlay } from "@/lib/mirror-product-overlay";
import type { ProductHighlight } from "@/lib/product-highlights";
import {
  rewriteMirrorTemplateSlugReferences,
  suppressAliasedTemplateProductSections,
  injectTemplateSlugNavigationGuard,
  stripMirrorPostMessageScripts,
} from "@/lib/mirror-product-template-slug";
import { disableLoopWhenInsufficient, type SwiperCfg } from "@/lib/mirror-html-swiper-patch";
import {
  embedVideoThumbLabel,
  isEmbeddableProductVideoUrl,
  productGalleryMainVideoInnerHtml,
  productGalleryThumbEmbedPlaceholderHtml,
  productGalleryZoomVideoInnerHtml,
} from "@/lib/product-gallery-media";

export type VitrinProductMedia = {
  url: string;
  alt?: string | null;
  mediaType?: "image" | "video";
};

/** @deprecated use VitrinProductMedia */
export type VitrinProductImage = VitrinProductMedia;

export type VitrinProductVariant = {
  id: string;
  label: string;
  stockQty: number;
  isDefault?: boolean;
};

export type VitrinProductDetail = {
  productId: string;
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  images?: VitrinProductMedia[];
  variantOptionName?: string | null;
  variants?: VitrinProductVariant[];
  highlights?: ProductHighlight[];
  kind?: string | null;
  bundleComponents?: BundleComponentSnapshot[];
};

function productHref(slug: string) {
  return `/products/${encodeURIComponent(slug)}`;
}

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escText(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function normalizedMedia(product: VitrinProductDetail): VitrinProductMedia[] {
  const items = (product.images ?? [])
    .filter((img) => img?.url?.trim())
    .map((img) => ({
      url: resolvePublicMediaUrl(img.url.trim()),
      alt: img.alt?.trim() || product.title,
      mediaType: img.mediaType === "video" ? ("video" as const) : ("image" as const),
    }));
  if (items.length) return items;
  if (product.imageUrl?.trim()) {
    return [
      {
        url: resolvePublicMediaUrl(product.imageUrl.trim()),
        alt: product.title,
        mediaType: "image",
      },
    ];
  }
  return [];
}

function galleryFingerprint(product: VitrinProductDetail, media: VitrinProductMedia[]): string {
  return `${product.slug}::${media.map((m) => `${m.mediaType}:${m.url}`).join("|")}`;
}

function normalizeGalleryUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw, "https://local.invalid");
    return parsed.pathname;
  } catch {
    return raw.split("?")[0] ?? raw;
  }
}

function galleryDomMatchesAdminMedia(doc: Document, media: VitrinProductMedia[]): boolean {
  const slides = doc.querySelectorAll(
    "#MainContent .main--product-image-slider-outer .main--product-item",
  );
  if (slides.length !== media.length) return false;

  return media.every((item, index) => {
    const slide = slides[index];
    if (!slide) return false;
    if (item.mediaType === "video") {
      const embedUrl = slide
        .querySelector("[data-embed-url]")
        ?.getAttribute("data-embed-url")
        ?.trim();
      if (embedUrl) {
        return normalizeGalleryUrl(embedUrl) === normalizeGalleryUrl(item.url);
      }
      const src = slide.querySelector("video")?.getAttribute("src")?.trim() ?? "";
      return normalizeGalleryUrl(src) === normalizeGalleryUrl(item.url);
    }
    const img = slide.querySelector("img");
    const src =
      img?.getAttribute("data-original")?.trim() ||
      img?.getAttribute("src")?.trim() ||
      "";
    return normalizeGalleryUrl(src) === normalizeGalleryUrl(item.url);
  });
}

function primaryProductImageUrl(product: VitrinProductDetail): string | null {
  const media = normalizedMedia(product);
  const image = media.find((item) => item.mediaType === "image") ?? media[0];
  return image?.url?.trim() || null;
}

function primaryImageFromMainGallery(doc: Document): string | null {
  const img = doc.querySelector(
    "#MainContent .main--product-image-slider-outer img, #MainContent .main--product-item img",
  );
  if (!isImageNode(img)) return null;
  return img.getAttribute("data-original")?.trim() || img.src?.trim() || null;
}

function setMirrorProductImage(img: HTMLImageElement, url: string, alt?: string) {
  const raw = url.trim();
  if (!raw) return;
  const bust = raw.includes("?") ? `${raw}&kn=1` : `${raw}?kn=1`;
  img.src = bust;
  img.setAttribute("data-original", raw);
  img.setAttribute("data-src", raw);
  img.setAttribute("srcset", `${bust} 1x, ${bust} 2x`);
  img.removeAttribute("data-srcset");
  img.removeAttribute("data-sizes");
  img.removeAttribute("data-widths");
  img.removeAttribute("lazyload");
  img.removeAttribute("loading");
  img.classList.remove("lazyload", "no-js-hidden");
  if (alt) img.alt = alt;
}

/** Theme zoom popup id: product-media-content-{sectionId} */
function detectProductMediaSectionId(doc: Document): string | null {
  const popup = doc.querySelector('[data-product-media-content] [id^="product-media-content-"]');
  const popupId = popup?.id;
  if (popupId?.startsWith("product-media-content-")) {
    return popupId.slice("product-media-content-".length);
  }

  // legacyBtn: template'daki orijinal zoom butonlarından section id oku (en güvenilir)
  const legacyBtn = doc.querySelector('#MainContent media-zoom-button[data-section]');
  const legacySection = legacyBtn?.getAttribute("data-section");
  if (legacySection?.trim()) return legacySection.trim();

  // section id'den çıkar — sadece "kn-mirror-section-" ve "kn-section-" önekini kırp,
  // "template--" kısmını koru (popup: product-media-content-template--{id}__main)
  const section = doc.querySelector(
    '#MainContent .kn-mirror-section.section-main-product, #MainContent [id^="kn-mirror-section-template--"][id$="__main"], #MainContent [id^="kn-section-template--"][id$="__main"]',
  );
  if (section?.id) {
    for (const prefix of [
      "kn-mirror-section-",
      "kn-section-",
    ] as const) {
      if (section.id.startsWith(prefix)) return section.id.slice(prefix.length);
    }
  }

  return null;
}

function mediaSlideHtml(
  item: VitrinProductMedia,
  product: VitrinProductDetail,
  index: number,
  sectionId: string | null,
) {
  const alt = escAttr(item.alt || product.title);
  const url = escAttr(item.url);
  if (item.mediaType === "video") {
    const embed = isEmbeddableProductVideoUrl(item.url);
    const mediaClass = embed ? "media kn-product-gallery-embed-host" : "media";
    const inner = productGalleryMainVideoInnerHtml(item.url, item.alt || product.title);
    return `<div class="main--product-item swiper-slide" data-media-id="admin-video-${index}">
      <div class="main--product-img media-wrapper width-100 height-100">
        <div class="${mediaClass}" style="${productImageMediaRatioStyle()};">
          ${inner}
        </div>
      </div>
    </div>`;
  }
  const sectionAttr = sectionId ? escAttr(sectionId) : "";
  const zoomBtn = sectionAttr
    ? `<media-zoom-button data-section="${sectionAttr}" data-index="${index}"></media-zoom-button>`
    : "";
  return `<div class="main--product-item swiper-slide" data-media-id="admin-image-${index}">
    <div class="main--product-img media-wrapper width-100 height-100">
      <div class="media" style="${productImageMediaRatioStyle()};">
        ${zoomBtn}
        <img src="${url}" data-original="${url}" alt="${alt}" width="${PRODUCT_IMAGE_WIDTH}" height="${PRODUCT_IMAGE_HEIGHT}" sizes="auto"${index === 0 ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'}>
      </div>
    </div>
  </div>`;
}

function zoomModalSlideHtml(item: VitrinProductMedia, product: VitrinProductDetail, index: number) {
  const alt = escAttr(item.alt || product.title);
  const url = escAttr(item.url);
  if (item.mediaType === "video") {
    const inner = productGalleryZoomVideoInnerHtml(item.url, item.alt || product.title);
    const zoomClass = isEmbeddableProductVideoUrl(item.url)
      ? "swiper-zoom-container kn-product-gallery-embed-host"
      : "swiper-zoom-container";
    return `<div class="swiper-slide" data-media-id="admin-zoom-video-${index}">
      <div class="main--product-media-item">
        <div class="${zoomClass}">
          ${inner}
        </div>
      </div>
    </div>`;
  }
  return `<div class="swiper-slide" data-media-id="admin-zoom-image-${index}">
    <div class="main--product-media-item">
      <div class="swiper-zoom-container">
        <img src="${url}" data-original="${url}" alt="${alt}" width="${PRODUCT_IMAGE_WIDTH}" height="${PRODUCT_IMAGE_HEIGHT}" sizes="auto" loading="lazy">
      </div>
    </div>
  </div>`;
}

function fixPopupCloseIconInTemplate(doc: Document) {
  doc
    .querySelectorAll("[data-product-media-content] template .popup-close svg line, [data-product-media-content] template .popup-close svg path")
    .forEach((el) => {
      el.setAttribute("stroke", "currentColor");
      el.removeAttribute("fill");
    });
}

function replaceSwiperWrapperInner(html: string, innerHtml: string): string {
  const openRe = /<div\b([^>]*\bclass="[^"]*\bswiper-wrapper\b[^"]*"[^>]*)>/i;
  const openMatch = openRe.exec(html);
  if (!openMatch || openMatch.index === undefined) return html;

  const contentStart = openMatch.index + openMatch[0].length;
  let depth = 1;
  let pos = contentStart;
  let closeStart = -1;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = nextOpen + 4;
      continue;
    }

    depth -= 1;
    if (depth === 0) closeStart = nextClose;
    pos = nextClose + "</div>".length;
  }

  if (closeStart < 0) return html;
  return `${html.slice(0, contentStart)}${innerHtml}${html.slice(closeStart)}`;
}

function patchZoomSwiperConfigInHtml(html: string, slideCount: number): string {
  return html.replace(/data-swiper=(['"])\s*(\{[\s\S]*?\})\s*\1/g, (match, quote: string, jsonStr: string) => {
    try {
      const cfg = JSON.parse(jsonStr.trim()) as SwiperCfg;
      cfg.slidesPerView = capSlidesPerView(cfg.slidesPerView, slideCount) ?? 1;
      cfg.loop = false;
      if (cfg.breakpoints) {
        for (const bp of Object.values(cfg.breakpoints)) {
          if (bp) bp.loop = false;
        }
      }
      return `data-swiper=${quote}${JSON.stringify(cfg)}${quote}`;
    } catch {
      return match;
    }
  });
}

function patchProductMediaZoomTemplate(
  doc: Document,
  product: VitrinProductDetail,
  media: VitrinProductMedia[],
) {
  const newSlides = media.map((item, index) => zoomModalSlideHtml(item, product, index)).join("");

  // linkedom'da template.content serialize kaybı — innerHTML string ile tam wrapper değişimi
  const templateRoot = doc.querySelector(
    "[data-product-media-content] template",
  ) as HTMLTemplateElement | null;
  if (templateRoot) {
    let templateHtml = replaceSwiperWrapperInner(templateRoot.innerHTML, newSlides);
    templateHtml = patchZoomSwiperConfigInHtml(templateHtml, media.length);
    templateRoot.innerHTML = templateHtml;
    fixPopupCloseIconInTemplate(doc);
  }

  patchZoomGallerySwiperConfig(doc, media.length);
}

type ProductGallerySwiperCfg = {
  loop?: boolean;
  speed?: number;
  slidesPerView?: number | string;
  spaceBetween?: number;
  navigation?: { enabled?: boolean; nextEl?: string; prevEl?: string };
  breakpoints?: Record<
    string,
    {
      loop?: boolean;
      slidesPerView?: number | string;
      navigation?: { enabled?: boolean; nextEl?: string; prevEl?: string };
    }
  >;
};

function capSlidesPerView(
  spv: number | string | undefined,
  slideCount: number,
): number | string | undefined {
  if (spv === undefined) return undefined;
  if (typeof spv === "string") return spv;
  return Math.min(spv, slideCount);
}

/** Tüm PDP'lerde aynı galeri swiper düzeni — prebuild/eski tema değerlerini ezmez */
function normalizeProductGallerySwiperConfig(cfg: ProductGallerySwiperCfg, slideCount: number) {
  const {
    speed,
    spaceBetween,
    mobileSlidesPerView,
    desktopBreakpoint,
    desktopSlidesPerView,
  } = PRODUCT_GALLERY_SWIPER;

  cfg.speed = speed;
  cfg.spaceBetween = spaceBetween;
  cfg.slidesPerView = capSlidesPerView(mobileSlidesPerView, slideCount) ?? 1;

  if (!cfg.breakpoints) cfg.breakpoints = {};
  const desktopBp = { ...(cfg.breakpoints[desktopBreakpoint] ?? {}) };
  desktopBp.slidesPerView =
    capSlidesPerView(desktopSlidesPerView, slideCount) ?? desktopSlidesPerView;

  if (slideCount >= 2) {
    cfg.navigation = { ...(cfg.navigation ?? {}), enabled: true };
    desktopBp.navigation = {
      ...(desktopBp.navigation ?? cfg.navigation ?? {}),
      enabled: true,
    };
  } else {
    if (cfg.navigation) cfg.navigation.enabled = false;
    if (desktopBp.navigation) desktopBp.navigation.enabled = false;
  }
  cfg.breakpoints[desktopBreakpoint] = desktopBp;

  const canSwipe = slideCount > 1;
  (cfg as Record<string, unknown>).grabCursor = canSwipe;
  (cfg as Record<string, unknown>).allowTouchMove = canSwipe;
  (cfg as Record<string, unknown>).resizeObserver = true;
  (cfg as Record<string, unknown>).watchOverflow = true;

  const patched = disableLoopWhenInsufficient(cfg as SwiperCfg, slideCount);
  cfg.loop = patched.loop;
  if (patched.breakpoints) {
    cfg.breakpoints = patched.breakpoints as ProductGallerySwiperCfg["breakpoints"];
  }
}

function patchZoomGallerySwiperConfig(doc: Document, slideCount: number) {
  doc
    .querySelectorAll(
      "[data-product-media-content] [data-swiper], [data-product-media-popup] [data-swiper]",
    )
    .forEach((el) => {
      const raw = el.getAttribute("data-swiper");
      if (!raw) return;
      try {
        const cfg = JSON.parse(raw.trim()) as SwiperCfg;
        cfg.slidesPerView = capSlidesPerView(cfg.slidesPerView, slideCount) ?? 1;
        cfg.loop = false;
        if (cfg.breakpoints) {
          for (const bp of Object.values(cfg.breakpoints)) {
            if (bp) bp.loop = false;
          }
        }
        el.setAttribute("data-swiper", JSON.stringify(cfg));
      } catch {
        /* şablon JSON bozuksa yoksay */
      }
    });
}

function ensureGalleryFallbackStyles(doc: Document) {
  if (doc.getElementById("kn-product-gallery-fallback")) return;
  const style = doc.createElement("style");
  style.id = "kn-product-gallery-fallback";
  style.textContent = `html:not([data-kn-product-sync]) #MainContent .main--product-image-slider-outer{opacity:0;}
#MainContent .main--product-image-slider-outer[data-kn-gallery-fp]{opacity:1!important;}`;
  doc.head.appendChild(style);
}

/** Mirror embed scroll-lock breaks theme lightbox (fixed → in-flow). */
function ensureProductMediaZoomFix(doc: Document) {
  let style = doc.getElementById("kn-product-media-zoom-fix-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "kn-product-media-zoom-fix-style";
    doc.head.appendChild(style);
  }
  style.textContent = `
html.kn-mirror-embed product-media-popup.popup,
html.kn-mirror-embed .popup.product-media-popup {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  z-index: 20000 !important;
  margin: 0 !important;
}
html.kn-mirror-embed product-media-popup.popup .popup-dialog.fullwidth,
html.kn-mirror-embed .popup.product-media-popup .popup-dialog.fullwidth {
  max-width: 100% !important;
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}
html.kn-mirror-embed product-media-popup .popup-close,
html.kn-mirror-embed .product-media-popup .popup-close {
  pointer-events: all !important;
  z-index: 5 !important;
  position: relative !important;
}
html.kn-mirror-embed.kn-product-zoom-open #kn-street-food-bar {
  display: none !important;
}
html.kn-mirror-embed.kn-product-zoom-open,
html.kn-mirror-embed.kn-product-zoom-open body {
  overflow: visible !important;
}
@media (max-width: 767px) {
  #MainContent .main--product-image-slider-outer media-zoom-button {
    pointer-events: none !important;
  }
}
#MainContent .main--product-image-slider-outer .main--product-img .media > img,
#MainContent .main--product-image-slider-outer .main--product-img .media > video {
  pointer-events: none !important;
}
/* Popup zoom swiper: resim boyutunu viewport ile sınırla */
html.kn-mirror-embed product-media-popup .swiper-zoom-container img,
html.kn-mirror-embed .product-media-popup .swiper-zoom-container img {
  max-height: 90vh !important;
  max-width: 95vw !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
}
/* Masaüstü: Trendyol gibi büyük, ortalanmış görsel */
@media (min-width: 768px) {
  html.kn-mirror-embed product-media-popup .swiper-zoom-container img,
  html.kn-mirror-embed .product-media-popup .swiper-zoom-container img {
    max-height: 88vh !important;
    max-width: 80vw !important;
  }
  html.kn-mirror-embed product-media-popup .popup-dialog.fullwidth,
  html.kn-mirror-embed .product-media-popup .popup-dialog.fullwidth {
    flex-direction: row !important;
  }
}
html.kn-mirror-embed product-media-popup .swiper,
html.kn-mirror-embed .product-media-popup .swiper {
  height: 100% !important;
}
html.kn-mirror-embed product-media-popup .swiper-slide,
html.kn-mirror-embed .product-media-popup .swiper-slide {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}`;

  doc.getElementById("kn-product-media-zoom-fix-script")?.remove();
  const script = doc.createElement("script");
  script.id = "kn-product-media-zoom-fix-script";
  script.textContent = `(function(){
  var KN_ZOOM_VER=3;
  if(window.__knProductZoomVer===KN_ZOOM_VER)return;
  window.__knProductZoomVer=KN_ZOOM_VER;
  var TAP_MOVE_PX=14;
  var TAP_MAX_MS=420;
  var pending=null;
  function isMobile(){
    return window.matchMedia("(max-width: 767px)").matches;
  }
  function mainGallerySwiper(){
    var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
    return outer&&outer.swiper?outer.swiper:null;
  }
  function resolveGalleryIndex(btn){
    // Önce: tıklanan butondaki data-index — masaüstü slidesPerView>1 durumunda en güvenilir
    var fromAttr=parseInt(btn&&btn.dataset&&btn.dataset.index,10);
    if(!isNaN(fromAttr))return fromAttr;
    // Butonu içeren slide'ın DOM sırası
    var slide=btn&&btn.closest?btn.closest(".swiper-slide"):null;
    if(slide&&!slide.classList.contains("swiper-slide-duplicate")){
      var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
      var slides=outer?Array.prototype.slice.call(outer.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)")):[];
      var idx=slides.indexOf(slide);
      if(idx>=0)return idx;
    }
    // Fallback: swiper aktif index (tek resimli mobil için)
    var sw=mainGallerySwiper();
    if(sw&&typeof sw.realIndex==="number"&&!isNaN(sw.realIndex))return sw.realIndex;
    if(sw&&typeof sw.activeIndex==="number"&&!isNaN(sw.activeIndex))return sw.activeIndex;
    return 0;
  }
  function selectPopupSlide(popup,index){
    var host=popup.querySelector("swiper-content");
    var tries=0;
    function run(){
      var sw=(host&&host.swiper)||(function(){var el=popup.querySelector(".swiper");return el&&el.swiper;})();
      if(!sw)return false;
      if(sw.params&&sw.params.loop&&typeof sw.slideToLoop==="function")sw.slideToLoop(index,0);
      else if(typeof sw.slideTo==="function")sw.slideTo(index,0);
      return true;
    }
    if(run())return;
    var timer=setInterval(function(){
      if(run()||++tries>40)clearInterval(timer);
    },50);
  }
  function openProductZoom(btn){
    if(!btn)return false;
    var section=btn.closest(".kn-mirror-section");
    var sectionId=btn.dataset.section;
    var template=section&&section.querySelector("[data-product-media-content] template");
    if(!template||!sectionId)return false;
    var index=resolveGalleryIndex(btn);
    document.querySelectorAll("product-media-popup[id^='product-media-content-']").forEach(function(node){node.remove();});
    var content=template.content.firstElementChild.cloneNode(true);
    document.body.appendChild(content);
    var popup=document.getElementById("product-media-content-"+sectionId);
    if(!popup)return false;
    popup.style.display="flex";
    setTimeout(function(){selectPopupSlide(popup,index);},60);
    setTimeout(function(){popup.classList.add("show");},180);
    setTimeout(function(){popup.classList.add("shadow");},420);
    var outerHost=document.querySelector("#MainContent swiper-content");
    if(outerHost&&typeof outerHost._selectSlide==="function"){
      setTimeout(function(){outerHost._selectSlide(index);},500);
    }
    return true;
  }
  function activeGalleryMedia(target){
    return target&&target.closest&&target.closest("#MainContent .main--product-image-slider-outer .swiper-slide-active .media");
  }
  document.addEventListener("touchstart",function(e){
    if(!isMobile())return;
    var media=activeGalleryMedia(e.target);
    if(!media){pending=null;return;}
    var t=e.changedTouches&&e.changedTouches[0];
    if(!t)return;
    pending={x:t.clientX,y:t.clientY,t:Date.now(),moved:false,media:media};
  },{passive:true,capture:true});
  document.addEventListener("touchmove",function(e){
    if(!pending)return;
    var t=e.changedTouches&&e.changedTouches[0];
    if(!t)return;
    if(Math.abs(t.clientX-pending.x)>TAP_MOVE_PX||Math.abs(t.clientY-pending.y)>TAP_MOVE_PX)pending.moved=true;
  },{passive:true,capture:true});
  document.addEventListener("touchend",function(e){
    if(!isMobile()||!pending)return;
    var snap=pending;
    pending=null;
    if(snap.moved||Date.now()-snap.t>TAP_MAX_MS)return;
    var media=activeGalleryMedia(e.target);
    if(!media||media!==snap.media)return;
    var btn=media.querySelector("media-zoom-button");
    if(!btn)return;
    e.preventDefault();
    openProductZoom(btn);
  },true);
  document.addEventListener("touchcancel",function(){pending=null;},true);
  document.addEventListener("click",function(e){
    if(isMobile())return;
    var btn=e.target&&e.target.closest&&e.target.closest("#MainContent media-zoom-button");
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openProductZoom(btn);
  },true);
  var _zoomWasOpen=false;
  function sync(){
    var open=!!document.querySelector("product-media-popup.show,.product-media-popup.show");
    document.documentElement.classList.toggle("kn-product-zoom-open",open);
    var bar=document.getElementById("kn-street-food-bar");
    if(bar)bar.toggleAttribute("hidden",open);
    if(open!==_zoomWasOpen){
      _zoomWasOpen=open;
      try{window.parent.postMessage({type:open?"kn-zoom-open":"kn-zoom-close"},"*");}catch(e){}
    }
  }
  try{
    new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});
  }catch(e){}
  document.addEventListener("click",function(){setTimeout(sync,0);setTimeout(sync,450);});
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape")return;
    var p=document.querySelector("product-media-popup.show,.product-media-popup.show");
    if(!p)return;
    var close=p.querySelector("[data-popup-close]");
    if(close)close.click();
  });
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}

function patchSwiperConfigForSlideCount(outer: Element, slideCount: number) {
  const raw = outer.getAttribute("data-swiper");
  if (!raw) return;
  try {
    const cfg = JSON.parse(raw.trim()) as ProductGallerySwiperCfg;
    normalizeProductGallerySwiperConfig(cfg, slideCount);
    outer.setAttribute("data-swiper", JSON.stringify(cfg));
  } catch {
    /* şablon JSON bozuksa yoksay */
  }
}

/** Tema swiper-content bileşenini yeniden başlat — King Noor geçişleri */
function injectThemeProductGalleryReinit(doc: Document) {
  ensureGalleryFallbackStyles(doc);
  const id = "kn-product-gallery-reinit";
  doc.getElementById(id)?.remove();

  const script = doc.createElement("script");
  script.id = id;
  script.textContent = `(function(){
  function boot(){
    var outer=document.querySelector("#MainContent .main--product-image-slider-outer");
    if(!outer)return;
    var host=outer.closest("swiper-content");
    if(host&&typeof host._initial_run==="function"){
      host._initial_run();
      return;
    }
    if(typeof Swiper==="undefined")return;
    try{
      if(outer.swiper&&typeof outer.swiper.destroy==="function")outer.swiper.destroy(true,true);
      var raw=outer.getAttribute("data-swiper");
      if(!raw)return;
      outer.swiper=new Swiper(outer,JSON.parse(raw.trim()));
    }catch(e){}
  }
  boot();setTimeout(boot,80);setTimeout(boot,400);setTimeout(boot,1200);
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}

/** Thumbnail sidebar — ana galeri ile data-media-id eşleşmesini garanti eder */
function patchThumbnailSlider(
  doc: Document,
  product: VitrinProductDetail,
  media: VitrinProductMedia[],
) {
  const thumbWrapper = doc.querySelector(
    "#MainContent .main--product-thumbnail-outer .swiper-wrapper, " +
    "#MainContent [data-product-thumbnail-slider] .swiper-wrapper, " +
    "#MainContent .main--product-thumbnail-slider .swiper-wrapper, " +
    "#MainContent .main--product-thumbnail-slider",
  );
  if (!thumbWrapper) return;

  thumbWrapper.innerHTML = media
    .map((item, index) => {
      const url = escAttr(item.url);
      const alt = escAttr(item.alt || product.title);
      const mediaId = item.mediaType === "video" ? `admin-video-${index}` : `admin-image-${index}`;
      const thumbInner =
        item.mediaType === "video" && isEmbeddableProductVideoUrl(item.url)
          ? productGalleryThumbEmbedPlaceholderHtml(embedVideoThumbLabel(item.url))
          : item.mediaType === "video"
            ? `<video src="${url}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img src="${url}" data-original="${url}" alt="${alt}"
              width="${PRODUCT_IMAGE_THUMB.galleryThumb.width}" height="${PRODUCT_IMAGE_THUMB.galleryThumb.height}" loading="${index === 0 ? "eager" : "lazy"}">`;
      return `<div class="swiper-slide main--thumbnail-item" data-media-id="${mediaId}">
        <div class="main--product-thumbnail media-wrapper">
          <div class="media" style="${productImageMediaRatioStyle()};">
            ${thumbInner}
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function patchMainImage(doc: Document, product: VitrinProductDetail) {
  const media = normalizedMedia(product);
  if (!media.length) return;

  ensureGalleryFallbackStyles(doc);
  ensureProductMediaZoomFix(doc);

  const outer = doc.querySelector("#MainContent .main--product-image-slider-outer") as HTMLElement | null;
  if (!outer) return;

  const fp = galleryFingerprint(product, media);
  const alreadySynced =
    outer.getAttribute("data-kn-gallery-fp") === fp &&
    outer.getAttribute("data-kn-gallery-v") === PRODUCT_GALLERY_SWIPER.markupVersion &&
    galleryDomMatchesAdminMedia(doc, media);

  const sectionId = detectProductMediaSectionId(doc);
  patchProductMediaZoomTemplate(doc, product, media);
  patchSwiperConfigForSlideCount(outer, media.length);

  if (alreadySynced) {
    outer.style.opacity = "1";
    return;
  }

  const wrapper =
    outer.querySelector(".main--product-image-slider[data-main-product-slider]") ??
    outer.querySelector(".main--product-image-slider.swiper-wrapper") ??
    outer.querySelector(".main--product-image-slider");

  const slides = media
    .map((item, index) => mediaSlideHtml(item, product, index, sectionId))
    .join("");

  if (wrapper) {
    wrapper.innerHTML = slides;
    wrapper.classList.add("swiper-wrapper", "is-slider", "pb-0");
    outer.classList.add("swiper");
    if (!outer.hasAttribute("data-swiper-main")) {
      outer.setAttribute("data-swiper-main", "");
    }
  } else {
    outer.innerHTML = `<div class="main--product-image-slider swiper-wrapper is-slider pb-0" data-main-product-slider="">${slides}</div>`;
    outer.classList.add("swiper");
  }

  outer.classList.remove("kn-gallery-static", "kn-gallery-active");
  outer.setAttribute("data-kn-gallery-slug", product.slug);
  outer.setAttribute("data-kn-gallery-fp", fp);
  outer.setAttribute("data-kn-gallery-v", PRODUCT_GALLERY_SWIPER.markupVersion);
  doc.documentElement.setAttribute("data-kn-gallery-v", PRODUCT_GALLERY_SWIPER.markupVersion);
  outer.style.opacity = "1";

  patchThumbnailSlider(doc, product, media);
  injectThemeProductGalleryReinit(doc);
}

function patchTitle(doc: Document, product: VitrinProductDetail) {
  const href = productHref(product.slug);
  doc.querySelectorAll("#MainContent .product-title-heading").forEach((el) => {
    el.textContent = product.title;
    if (isAnchorNode(el)) {
      el.href = href;
      el.setAttribute("aria-label", product.title);
    }
  });

  doc.querySelectorAll("#MainContent product-set[data-url], #MainContent variants-set[data-url]").forEach((el) => {
    el.setAttribute("data-url", href);
  });
}

function patchDescription(doc: Document, product: VitrinProductDetail) {
  const short = product.description?.trim() ?? "";
  doc.querySelectorAll("#MainContent .product--description").forEach((el) => {
    el.textContent = short;
  });
}

/** PDP ana görsel / zoom alanı ürün linki değildir; tema şablon linklerini taşırsa top-route'a kaçmasın. */
function neutralizeProductMediaNavigation(doc: Document) {
  const mediaRootSelectors = [
    "#MainContent .main--product-image-wrapper",
    "#MainContent .main--product-image-slider-outer",
    "#MainContent [data-product-media-content]",
    "#MainContent product-media-popup",
  ];

  for (const selector of mediaRootSelectors) {
    doc.querySelectorAll(`${selector} a[href]`).forEach((el) => {
      el.setAttribute("href", "#kn-product-media");
      el.setAttribute("data-kn-ignore-link", "1");
      el.removeAttribute("data-url");
      el.removeAttribute("data-product-url");
    });

    doc.querySelectorAll(`${selector} [data-url], ${selector} [data-product-url]`).forEach((el) => {
      el.removeAttribute("data-url");
      el.removeAttribute("data-product-url");
      el.setAttribute("data-kn-ignore-link", "1");
    });
  }
}

function patchProductStorePathMeta(doc: Document, product: VitrinProductDetail) {
  const meta = doc.querySelector('meta[name="kn-store-path"]');
  if (meta) meta.setAttribute("content", productHref(product.slug));
}

/** Sağ alt sabit sepet kartı — şablon ürünü yerine incelenen ürün */
export function patchStickyBuyButton(doc: Document, product: VitrinProductDetail) {
  const sticky = doc.querySelector(
    "sticky-buy-button.sticky-buy-button-wrapper, .sticky-buy-button-wrapper",
  );
  if (!sticky) return;

  const variants = product.variants ?? [];
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  const imageUrl = primaryProductImageUrl(product) ?? primaryImageFromMainGallery(doc);

  if (imageUrl) {
    sticky.querySelectorAll(".sticky--product-image img").forEach((img) => {
      if (!isImageNode(img)) return;
      setMirrorProductImage(img, imageUrl, product.title);
    });
  }

  sticky.querySelectorAll(".sticky--product-detail .product--title").forEach((el) => {
    el.textContent = product.title;
  });

  const variantTitle = sticky.querySelector(".sticky--product-detail .product--variant-title");
  if (isElementNode(variantTitle)) {
    if (defaultVariant?.label) {
      variantTitle.textContent = defaultVariant.label;
      variantTitle.style.display = "";
    } else {
      variantTitle.textContent = "";
      variantTitle.style.display = "none";
    }
  }
}

function patchProductHighlights(doc: Document, highlights: ProductHighlight[]) {
  const items = doc.querySelectorAll("#MainContent .custom-icons-list .custom-icons-item");
  if (!items.length) return;

  highlights.forEach((highlight, index) => {
    const li = items[index];
    if (!li) return;
    const label = highlight.label.trim();
    if (label) {
      const text = li.querySelector(".custom-icons-text");
      if (text) text.textContent = label;
    }
    const iconUrl = highlight.iconUrl.trim();
    if (iconUrl) {
      li.querySelectorAll(".custom-icons-icon img").forEach((img) => {
        if (!isImageNode(img)) return;
        img.src = iconUrl;
        img.setAttribute("data-src", iconUrl);
        img.setAttribute("data-original", iconUrl);
        img.removeAttribute("loading");
        img.classList.remove("lazyload");
      });
    }
  });
}

function mainVariantScripts(product: VitrinProductDetail, optionName: string) {
  const variants = product.variants ?? [];
  return {
    productJson: JSON.stringify(
      variants.map((variant) => ({
        id: variant.id,
        title: variant.label,
        option1: variant.label,
        option2: null,
        option3: null,
        sku: null,
        requires_shipping: true,
        taxable: true,
        featured_image: null,
        available: variant.stockQty > 0,
        name: `${product.title} - ${variant.label}`,
        public_title: variant.label,
        options: [variant.label],
        price: 0,
        weight: 0,
        compare_at_price: null,
        inventory_management: null,
        barcode: "",
        requires_selling_plan: false,
        selling_plan_allocations: [],
      })),
    ),
    optionsJson: JSON.stringify([
      {
        name: optionName,
        position: 1,
        values: variants.map((variant) => variant.label),
      },
    ]),
    inventoriesJson: JSON.stringify(
      variants.map((variant) => ({
        id: variant.id,
        inventory_management: null,
        inventory_policy: "deny",
        inventory_quantity: String(variant.stockQty),
      })),
    ),
  };
}

function patchVariants(doc: Document, product: VitrinProductDetail) {
  const wrap = doc.querySelector("#MainContent .product--variants-options");
  if (!wrap) return;

  const variants = product.variants ?? [];
  if (!variants.length) {
    if (isElementNode(wrap)) wrap.style.display = "none";
    return;
  }

  const set = wrap.querySelector("variants-set");
  const list = wrap.querySelector(".product--variants-list");
  const titleEl = wrap.querySelector(".product--variants-title");
  if (!set || !list || !titleEl) return;

  const href = productHref(product.slug);
  const sectionId = set.getAttribute("data-section") || "template";
  const formId =
    (wrap.querySelector("input.productOption") as HTMLInputElement | null)?.getAttribute("form") ||
    `main-product-form-${sectionId}`;
  const inputName = `option-1-${product.productId}-${sectionId}`;
  const optionName = product.variantOptionName?.trim() || "Options";
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];

  set.setAttribute("data-product", product.productId);
  set.setAttribute("data-url", href);
  titleEl.textContent = optionName;
  list.innerHTML = variants
    .map((variant, index) => {
      const safeId = `${product.productId}-${index}`;
      const checked = variant.id === defaultVariant.id ? " checked" : "";
      const disabled = variant.stockQty <= 0 ? "true" : "false";
      return `<li class="variant--item" is="hover-li" title="${escAttr(variant.label)}" data-option-disabled="${disabled}">
        <input
          class="productOption"
          id="option-1-${safeId}"
          type="radio"
          name="${escAttr(inputName)}"
          value="${escAttr(variant.label)}"
          form="${escAttr(formId)}"${checked}
          aria-labelledby="label-${safeId}"
        >
        <label for="option-1-${safeId}" id="label-${safeId}" class="variant-item-name">
          ${escText(variant.label)}
        </label>
      </li>`;
    })
    .join("");

  const scripts = mainVariantScripts(product, optionName);
  wrap.querySelectorAll('script[data-name="main-product"]').forEach((el) => {
    el.textContent = scripts.productJson;
  });
  wrap.querySelectorAll('script[data-name="main-product-options"]').forEach((el) => {
    el.textContent = scripts.optionsJson;
  });
  wrap.querySelectorAll('script[data-name="main-product-inventories"]').forEach((el) => {
    el.textContent = scripts.inventoriesJson;
  });

  doc.querySelectorAll('#MainContent input[name="product-id"]').forEach((el) => {
    if (isInputNode(el)) el.value = product.productId;
  });
  doc.querySelectorAll('#MainContent input[name="id"]').forEach((el) => {
    if (isInputNode(el)) el.value = defaultVariant.id;
  });
}

/** Generic mirror PDP template -> DB product data */
export function productGalleryReady(doc: Document, product?: VitrinProductDetail): boolean {
  if (!product) return true;
  const media = normalizedMedia(product);
  if (!media.length) return true;
  const outer = doc.querySelector("#MainContent .main--product-image-slider-outer");
  const fp = galleryFingerprint(product, media);
  if (outer?.getAttribute("data-kn-gallery-fp") !== fp) return false;
  if (outer?.getAttribute("data-kn-gallery-v") !== PRODUCT_GALLERY_SWIPER.markupVersion) {
    return false;
  }
  return galleryDomMatchesAdminMedia(doc, media);
}

function patchBundleContents(doc: Document, product: VitrinProductDetail) {
  const components = product.bundleComponents?.filter((c) => c.qty > 0) ?? [];
  if (!components.length) return;

  const listHtml = components
    .map(
      (c) =>
        `<li class="kn-bundle-component">${escText(c.title)}${c.qty > 1 ? ` × ${c.qty}` : ""}</li>`,
    )
    .join("");

  let box = doc.getElementById("kn-bundle-contents");
  if (!box) {
    const anchor =
      doc.querySelector("#MainContent .product--description") ??
      doc.querySelector("#MainContent .product-title-heading")?.parentElement;
    if (!anchor) return;
    box = doc.createElement("div");
    box.id = "kn-bundle-contents";
    box.className = "kn-bundle-contents";
    box.innerHTML = `<p class="kn-bundle-contents__title">Paket içeriği</p><ul class="kn-bundle-contents__list"></ul>`;
    anchor.insertAdjacentElement("afterend", box);
  }
  const ul = box.querySelector(".kn-bundle-contents__list");
  if (ul) ul.innerHTML = listHtml;
}

export function applyProductDetailFromAdmin(
  doc: Document,
  product: VitrinProductDetail,
  options?: { templateSlug?: string },
) {
  ensureMirrorProductImageStyles(doc);
  ensureProductMediaZoomFix(doc);
  patchTitle(doc, product);
  patchDescription(doc, product);
  patchMainImage(doc, product);
  if (product.kind === "bundle") patchBundleContents(doc, product);
  neutralizeProductMediaNavigation(doc);
  patchProductStorePathMeta(doc, product);
  patchVariants(doc, product);
  patchStickyBuyButton(doc, product);
  if (product.highlights?.length) patchProductHighlights(doc, product.highlights);

  // postMessage içeren tüm inline scriptleri kaldır — templateSlug olsun ya da olmasın.
  // ping / route-sync mekanizmaları DB verisiyle çalışan sayfada zararlı.
  stripMirrorPostMessageScripts(doc);

  const templateSlug = options?.templateSlug?.trim();
  if (templateSlug && templateSlug.toLowerCase() !== product.slug.toLowerCase()) {
    rewriteMirrorTemplateSlugReferences(doc, templateSlug, product.slug);
    suppressAliasedTemplateProductSections(doc);
    injectTemplateSlugNavigationGuard(doc, templateSlug, product.slug);
  }

  doc.documentElement.setAttribute("data-kn-product-sync", "1");
}