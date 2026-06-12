import { parseHTML } from "linkedom";
import {
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  PRODUCT_IMAGE_THUMB,
  productImageMediaRatioStyle,
} from "@/lib/product-image-spec";
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
    return `<div class="main--product-item swiper-slide" data-media-id="admin-video-${index}">
      <div class="main--product-img media-wrapper width-100 height-100">
        <div class="media" style="${productImageMediaRatioStyle()};">
          <video src="${url}" controls playsinline muted loop preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>
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
    return `<div class="swiper-slide" data-media-id="admin-zoom-video-${index}">
      <div class="main--product-media-item">
        <div class="swiper-zoom-container">
          <video src="${url}" controls playsinline style="width:100%;height:100%;object-fit:contain;"></video>
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

function patchProductMediaZoomTemplate(
  doc: Document,
  product: VitrinProductDetail,
  media: VitrinProductMedia[],
) {
  const newSlides = media.map((item, index) => zoomModalSlideHtml(item, product, index)).join("");

  // linkedom'da template.content'e yapılan DOM yazımları outerHTML serialize
  // edilirken kaybolur — template.innerHTML'i doğrudan string olarak yazıyoruz.
  const templateRoot = doc.querySelector(
    "[data-product-media-content] template",
  ) as HTMLTemplateElement | null;
  if (templateRoot) {
    const current = templateRoot.innerHTML;
    const next = current.replace(
      /<div\b([^>]*\bclass="[^"]*\bswiper-wrapper\b[^"]*"[^>]*)>[\s\S]*?<\/div>\s*(?=<\/div>\s*<\/swiper-content>|<\/div>\s*<div class="swiper--button-wrapper")/i,
      `<div$1>${newSlides}</div>`,
    );
    templateRoot.innerHTML =
      next !== current
        ? next
        : current.replace(
            /<div\b([^>]*\bclass="[^"]*\bswiper-wrapper\b[^"]*"[^>]*)>[\s\S]*?<\/div>/i,
            `<div$1>${newSlides}</div>`,
          );
    fixPopupCloseIconInTemplate(doc);
  }

  // Bazı tema versiyonlarında popup zaten DOM'da render edilmiş gelir (template dışında);
  // bu wrapper'ları da güncelle.
  doc.querySelectorAll("[data-product-media-content] .swiper-wrapper").forEach((liveWrapper) => {
    liveWrapper.innerHTML = newSlides;
  });
}

type ProductGallerySwiperCfg = {
  loop?: boolean;
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

/** Tema varsayılanı desktop'ta slidesPerView:3 — King Noor gibi tek görsel + ok + sürükleme */
function normalizeProductGallerySwiperConfig(cfg: ProductGallerySwiperCfg, slideCount: number) {
  cfg.slidesPerView = 1;
  cfg.spaceBetween = cfg.spaceBetween ?? 2;
  cfg.loop = slideCount > 2;
  (cfg as Record<string, unknown>).grabCursor = true;
  (cfg as Record<string, unknown>).allowTouchMove = true;

  if (slideCount >= 2) {
    cfg.navigation = { ...(cfg.navigation ?? {}), enabled: true };
  } else if (cfg.navigation) {
    cfg.navigation.enabled = false;
  }

  if (cfg.breakpoints) {
    for (const key of Object.keys(cfg.breakpoints)) {
      const bp = cfg.breakpoints[key];
      if (!bp) continue;
      bp.slidesPerView = 1;
      bp.loop = slideCount > 2;
      if (slideCount >= 2) {
        bp.navigation = {
          ...(bp.navigation ?? cfg.navigation ?? {}),
          enabled: true,
        };
      } else if (bp.navigation) {
        bp.navigation.enabled = false;
      }
    }
  }
}

function ensureGalleryFallbackStyles(doc: Document) {
  if (doc.getElementById("kn-product-gallery-fallback")) return;
  const style = doc.createElement("style");
  style.id = "kn-product-gallery-fallback";
  style.textContent = `html:not([data-kn-product-sync]) #MainContent .main--product-image-slider-outer{opacity:0;}
#MainContent .main--product-image-slider-outer[data-kn-gallery-fp]{opacity:1!important;}`;
  doc.head.appendChild(style);
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
      return `<div class="swiper-slide main--thumbnail-item" data-media-id="${mediaId}">
        <div class="main--product-thumbnail media-wrapper">
          <div class="media">
            <img src="${url}" data-original="${url}" alt="${alt}"
              width="${PRODUCT_IMAGE_THUMB.galleryThumb.width}" height="${PRODUCT_IMAGE_THUMB.galleryThumb.height}" loading="${index === 0 ? "eager" : "lazy"}">
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

  const outer = doc.querySelector("#MainContent .main--product-image-slider-outer") as HTMLElement | null;
  if (!outer) return;

  const fp = galleryFingerprint(product, media);
  if (
    outer.getAttribute("data-kn-gallery-fp") === fp &&
    galleryDomMatchesAdminMedia(doc, media)
  ) {
    patchSwiperConfigForSlideCount(outer, media.length);
    injectThemeProductGalleryReinit(doc);
    return;
  }

  const sectionId = detectProductMediaSectionId(doc);
  patchProductMediaZoomTemplate(doc, product, media);
  patchSwiperConfigForSlideCount(outer, media.length);

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

const PRODUCT_SYNC_GUARD = `<style id="kn-product-sync-guard">html:not([data-kn-product-sync]) #MainContent{visibility:hidden}</style>`;

/** Sunucu / prebuild — ürün başlık, galeri, fiyat HTML içine */
export function applyProductDetailToMirrorHtml(
  html: string,
  product: VitrinProductDetail,
  overlay: ProductContentOverlay = {},
  commerce?: MirrorProductCommercePayload | null,
  options?: { templateSlug?: string },
): string {
  const { document } = parseHTML(html);
  if (!document.getElementById("kn-product-sync-guard")) {
    document.head.insertAdjacentHTML("beforeend", PRODUCT_SYNC_GUARD);
  }
  applyProductDetailFromAdmin(document, product, options);
  applyProductContentOverlay(document, overlay);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  let out = `${doctype}\n${document.documentElement.outerHTML}`;
  if (commerce) out = injectMirrorProductCommerceHtml(out, commerce);
  return out;
}