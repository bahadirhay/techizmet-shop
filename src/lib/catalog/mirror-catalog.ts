/** Techizmet Shop mirror şablonundaki ürün ve koleksiyon tanımları */

const img = (file: string) => `/theme/techizmet-shop/cdn/shop/files/${file}`;
const col = (file: string) => `/theme/techizmet-shop/cdn/shop/collections/${file}`;

export const MIRROR_COLLECTIONS: readonly { slug: string; title: string; titleTr: string }[] = [];

export const MIRROR_COLLECTION_LIST: readonly { slug: string; title: string; titleTr: string; image: string }[] = [];

export const MIRROR_PRODUCTS: readonly { slug: string; title: string; priceMinor: number; compareAtMinor: number | null; image: string; collection: string }[] = [];

export function mirrorProductImage(file: string) {
  return img(file);
}

export function mirrorCollectionImage(file: string) {
  return col(file);
}

export const LEGACY_PRODUCT_REDIRECTS: Record<string, string> = {};
