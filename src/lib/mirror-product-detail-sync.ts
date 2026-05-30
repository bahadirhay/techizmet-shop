import type { ProductHighlight } from "@/lib/product-highlights";

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
      url: img.url.trim(),
      alt: img.alt?.trim() || product.title,
      mediaType: img.mediaType === "video" ? ("video" as const) : ("image" as const),
    }));
  if (items.length) return items;
  if (product.imageUrl?.trim()) {
    return [{ url: product.imageUrl.trim(), alt: product.title, mediaType: "image" }];
  }
  return [];
}

/** Theme zoom popup id: product-media-content-{sectionId} */
function detectProductMediaSectionId(doc: Document): string | null {
  const popup = doc.querySelector('[data-product-media-content] [id^="product-media-content-"]');
  const popupId = popup?.id;
  if (popupId?.startsWith("product-media-content-")) {
    return popupId.slice("product-media-content-".length);
  }

  const section = doc.querySelector(
    '#MainContent .shopify-section.section-main-product, #MainContent [id^="shopify-section-template--"][id$="__main"]',
  );
  if (section?.id?.startsWith("shopify-section-")) {
    return section.id.slice("shopify-section-".length);
  }

  const legacyBtn = doc.querySelector('#MainContent media-zoom-button[data-section]');
  const legacySection = legacyBtn?.getAttribute("data-section");
  return legacySection?.trim() || null;
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
        <div class="media" style="--image_ratio:130%;">
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
      <div class="media" style="--image_ratio:130%;">
        ${zoomBtn}
        <img src="${url}" data-original="${url}" alt="${alt}" width="1946" height="2503" sizes="auto">
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
        <img src="${url}" data-original="${url}" alt="${alt}" width="1166" height="1500" sizes="auto" loading="lazy">
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
  const templateRoot = doc.querySelector("[data-product-media-content] template") as HTMLTemplateElement | null;
  const wrapper = templateRoot?.content?.querySelector(".swiper-wrapper");
  if (!wrapper) return;

  wrapper.innerHTML = media.map((item, index) => zoomModalSlideHtml(item, product, index)).join("");
  fixPopupCloseIconInTemplate(doc);
}

function injectProductGallerySwiperReinit(doc: Document, slideCount: number) {
  const id = "kn-product-gallery-reinit";
  doc.getElementById(id)?.remove();

  const script = doc.createElement("script");
  script.id = id;
  script.textContent = `(function(){
  function boot(){
    var outer = document.querySelector("#MainContent .main--product-image-slider-outer");
    if (!outer) return;
    if (typeof Swiper === "undefined") { setTimeout(boot, 120); return; }
    try {
      if (outer.swiper && typeof outer.swiper.destroy === "function") {
        outer.swiper.destroy(true, true);
      }
    } catch (e) {}
    var raw = outer.getAttribute("data-swiper");
    if (!raw) return;
    try {
      var cfg = JSON.parse(raw.trim());
      var n = ${slideCount};
      if (n < 2) {
        cfg.loop = false;
        if (cfg.breakpoints) {
          Object.keys(cfg.breakpoints).forEach(function(k) {
            var b = cfg.breakpoints[k];
            if (!b) return;
            b.loop = false;
            if (typeof b.slidesPerView === "number" && b.slidesPerView > n) {
              b.slidesPerView = n;
            }
          });
        }
        if (typeof cfg.slidesPerView === "number" && cfg.slidesPerView > n) {
          cfg.slidesPerView = n;
        }
      }
      var sw = new Swiper(outer, cfg);
      outer.swiper = sw;
    } catch (e) {}
  }
  setTimeout(boot, 60);
  setTimeout(boot, 350);
  setTimeout(boot, 900);
})();`;
  (doc.body ?? doc.documentElement).appendChild(script);
}

function patchMainImage(doc: Document, product: VitrinProductDetail) {
  const media = normalizedMedia(product);
  if (!media.length) return;

  const sectionId = detectProductMediaSectionId(doc);
  patchProductMediaZoomTemplate(doc, product, media);

  const outer = doc.querySelector("#MainContent .main--product-image-slider-outer");
  if (!outer) return;

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

  injectProductGallerySwiperReinit(doc, media.length);
}

function patchTitle(doc: Document, product: VitrinProductDetail) {
  const href = productHref(product.slug);
  doc.querySelectorAll("#MainContent .product-title-heading").forEach((el) => {
    el.textContent = product.title;
    if (el instanceof HTMLAnchorElement) {
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
        if (!(img instanceof HTMLImageElement)) return;
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
        inventory_management: "shopify",
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
        inventory_management: "shopify",
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
    (wrap as HTMLElement).style.display = "none";
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
    if (el instanceof HTMLInputElement) el.value = product.productId;
  });
  doc.querySelectorAll('#MainContent input[name="id"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.value = defaultVariant.id;
  });
}

/** Generic mirror PDP template -> DB product data */
export function applyProductDetailFromAdmin(doc: Document, product: VitrinProductDetail) {
  patchTitle(doc, product);
  patchDescription(doc, product);
  patchMainImage(doc, product);
  patchVariants(doc, product);
  if (product.highlights?.length) patchProductHighlights(doc, product.highlights);
}
