/** Ürün kataloğu görselleri — vitrin, liste, detay, sepet (logo/blog/koleksiyon kapak hariç) */

export const PRODUCT_IMAGE_WIDTH = 1200;
export const PRODUCT_IMAGE_HEIGHT = 1800;
export const PRODUCT_IMAGE_ASPECT_RATIO = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT; // 2/3
export const PRODUCT_IMAGE_CROP_ASPECT = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
/** Tema `.media { padding-top: var(--image_ratio) }` — yükseklik/genişlik × 100 */
export const PRODUCT_IMAGE_MEDIA_RATIO_PERCENT = 150;

export function productImageHeightForWidth(width: number): number {
  return Math.round((width * PRODUCT_IMAGE_HEIGHT) / PRODUCT_IMAGE_WIDTH);
}

export const PRODUCT_IMAGE_THUMB = {
  galleryMain: { width: PRODUCT_IMAGE_WIDTH, height: PRODUCT_IMAGE_HEIGHT },
  galleryZoom: { width: PRODUCT_IMAGE_WIDTH, height: PRODUCT_IMAGE_HEIGHT },
  galleryThumb: { width: 80, height: productImageHeightForWidth(80) },
  cartDrawer: { width: 125, height: productImageHeightForWidth(125) },
  cartPageLine: { width: 185, height: productImageHeightForWidth(185) },
  cartFeatured: { width: 600, height: productImageHeightForWidth(600) },
  miniCart: { width: 72, height: productImageHeightForWidth(72) },
  favCard: { width: 400, height: productImageHeightForWidth(400) },
  favList: { width: 64, height: productImageHeightForWidth(64) },
} as const;

export function productImageMediaRatioStyle(): string {
  return `--image_ratio:${PRODUCT_IMAGE_MEDIA_RATIO_PERCENT}%`;
}

export function productImagePlaceholderStyle(): string {
  return `aspect-ratio:${PRODUCT_IMAGE_ASPECT_RATIO};background:var(--body_alternate_background)`;
}

/** PDP ana galeri — tüm ürün sayfalarında aynı swiper düzeni */
export const PRODUCT_GALLERY_SWIPER = {
  markupVersion: "4",
  speed: 800,
  spaceBetween: 2,
  mobileSlidesPerView: 1,
  desktopBreakpoint: "768",
  desktopSlidesPerView: 3,
} as const;

/** Admin ürün görseli kırpma penceresi */
export const PRODUCT_IMAGE_ADMIN_CROP = {
  aspectRatio: PRODUCT_IMAGE_CROP_ASPECT,
  outputWidth: PRODUCT_IMAGE_WIDTH,
  outputHeight: PRODUCT_IMAGE_HEIGHT,
  label: `${PRODUCT_IMAGE_WIDTH}×${PRODUCT_IMAGE_HEIGHT}`,
} as const;
