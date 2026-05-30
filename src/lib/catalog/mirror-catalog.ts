/** King Noor mirror şablonundaki ürün ve koleksiyon tanımları */

const img = (file: string) => `/theme/king-noor/cdn/shop/files/${file}`;
const col = (file: string) => `/theme/king-noor/cdn/shop/collections/${file}`;

export const MIRROR_COLLECTIONS = [
  { slug: "all", title: "All Products", titleTr: "Tüm ürünler" },
  { slug: "skincare", title: "Skincare Collection", titleTr: "Cilt bakımı" },
  { slug: "facial-boosters", title: "Facial Boosters", titleTr: "Yüz bakım güçlendiriciler" },
  { slug: "glow-essentials", title: "Glow Essentials", titleTr: "Işıltı essentials" },
  { slug: "luxe-skincare", title: "Luxe Skincare", titleTr: "Lüks cilt bakımı" },
  { slug: "moisture-magic", title: "Moisture Magic", titleTr: "Nem sihri" },
  { slug: "natural-glam", title: "Natural Glam", titleTr: "Doğal glam" },
  { slug: "pure-by-nature", title: "Pure by Nature", titleTr: "Doğadan saf" },
] as const;

/** Shopify /en-us/collections vitrin grid (6 kart) */
export const MIRROR_COLLECTION_LIST = [
  {
    slug: "facial-boosters",
    title: "Facial Boosters",
    titleTr: "Yüz bakım güçlendiriciler",
    image: col("C1_f724e030-afa8-496c-b92d-d7fa3d66b864c950.jpg"),
  },
  {
    slug: "glow-essentials",
    title: "Glow Essentials",
    titleTr: "Işıltı essentials",
    image: col("C6d393.jpg"),
  },
  {
    slug: "luxe-skincare",
    title: "Luxe Skincare",
    titleTr: "Lüks cilt bakımı",
    image: col("C4_c1fc0c0f-4ea5-4cbd-b4b5-8926be8da150a30c.jpg"),
  },
  {
    slug: "moisture-magic",
    title: "Moisture Magic",
    titleTr: "Nem sihri",
    image: col("C3_7b531285-ba84-439c-a143-7327bf1256599b21.jpg"),
  },
  {
    slug: "natural-glam",
    title: "Natural Glam",
    titleTr: "Doğal glam",
    image: col("C2_07357d08-eddb-49a0-9ae7-374f6d9fa4ca8d62.jpg"),
  },
  {
    slug: "pure-by-nature",
    title: "Pure by Nature",
    titleTr: "Doğadan saf",
    image: col("C5_3734a805-bfc6-458b-8479-2d33d9079ae9362f.jpg"),
  },
] as const;

/** Fiyatlar kuruş (TRY) — mirror USD × ~100 demo oranı */
export const MIRROR_PRODUCTS = [
  { slug: "hydrasilk-skin-reviving-cleanser", title: "HydraSilk Skin Reviving Cleanser", priceMinor: 53400, compareAtMinor: null, image: "14a5d41.jpg", collection: "skincare" },
  { slug: "micro-sculpting-moisturizer", title: "Micro-Sculpting Moisturizer", priceMinor: 52700, compareAtMinor: 185700, image: "6a9201.jpg", collection: "skincare" },
  { slug: "vitamin-c-hyaluronic-acid-radiant-serum", title: "Vitamin C Hyaluronic Acid Radiant Serum", priceMinor: 48900, compareAtMinor: null, image: "2a8bf8.jpg", collection: "facial-boosters" },
  { slug: "ultra-fine-hydration-mist", title: "Ultra-Fine Hydration Pure Mist", priceMinor: 45800, compareAtMinor: null, image: "13a642f.jpg", collection: "glow-essentials" },
  { slug: "skinglow-moisture-boost-serum", title: "SkinGlow Moisture Boost Serum", priceMinor: 51200, compareAtMinor: null, image: "18af34f.jpg", collection: "facial-boosters" },
  { slug: "hydrasoft-face-moisturizer", title: "HydraSoft Face Moisturizer", priceMinor: 44500, compareAtMinor: null, image: "76418.jpg", collection: "moisture-magic" },
  { slug: "daily-use-face-moisturizer", title: "Daily Use Face Moisturizer", priceMinor: 39900, compareAtMinor: null, image: "14a5d41.jpg", collection: "moisture-magic" },
  { slug: "spectrum-sunscreen-spf-50", title: "Spectrum Sunscreen SPF 50", priceMinor: 42900, compareAtMinor: null, image: "6a9201.jpg", collection: "pure-by-nature" },
  { slug: "berry-tint-lip-balm", title: "Berry Tint Lip Balm", priceMinor: 18900, compareAtMinor: null, image: "2a8bf8.jpg", collection: "natural-glam" },
  { slug: "24hr-smudge-proof-mascara", title: "24hr Smudge Proof Mascara", priceMinor: 24900, compareAtMinor: null, image: "13a642f.jpg", collection: "natural-glam" },
  { slug: "flawless-silkskin-foundation", title: "Flawless Silkskin Foundation", priceMinor: 55900, compareAtMinor: null, image: "18af34f.jpg", collection: "natural-glam" },
  { slug: "creamy-foundation-for-all-skin-types", title: "Creamy Foundation for All Skin Types", priceMinor: 49900, compareAtMinor: null, image: "76418.jpg", collection: "natural-glam" },
  { slug: "liquid-foundation-spf-30", title: "Liquid Foundation SPF 30", priceMinor: 51900, compareAtMinor: null, image: "14a5d41.jpg", collection: "natural-glam" },
  { slug: "smooth-finish-hd-concealer", title: "Smooth Finish HD Concealer", priceMinor: 27900, compareAtMinor: null, image: "6a9201.jpg", collection: "natural-glam" },
  { slug: "dual-contour-bronzer-set", title: "Dual Contour Bronzer Set", priceMinor: 34900, compareAtMinor: null, image: "2a8bf8.jpg", collection: "natural-glam" },
  { slug: "dewmist-hydrating-makeup-fixer", title: "DewMist Hydrating Makeup Fixer", priceMinor: 31900, compareAtMinor: null, image: "13a642f.jpg", collection: "natural-glam" },
  { slug: "long-lasting-make-up-fixer", title: "Long Lasting Make Up Fixer", priceMinor: 29900, compareAtMinor: null, image: "18af34f.jpg", collection: "natural-glam" },
  { slug: "floral-eau-de-parfum-long-lasting", title: "Floral Eau de Parfum Long Lasting", priceMinor: 68900, compareAtMinor: null, image: "76418.jpg", collection: "luxe-skincare" },
  { slug: "anti-cellulite-body-oil", title: "Anti Cellulite Body Oil", priceMinor: 37900, compareAtMinor: null, image: "14a5d41.jpg", collection: "luxe-skincare" },
  { slug: "hydrating-shampoo-for-soft-smooth-hair", title: "Hydrating Shampoo for Soft Smooth Hair", priceMinor: 26900, compareAtMinor: null, image: "6a9201.jpg", collection: "pure-by-nature" },
] as const;

export function mirrorProductImage(file: string) {
  return img(file);
}

export function mirrorCollectionImage(file: string) {
  return col(file);
}

/** Eski kısa slug → mirror slug */
export const LEGACY_PRODUCT_REDIRECTS: Record<string, string> = {
  "hydra-cleanser": "hydrasilk-skin-reviving-cleanser",
  "hyaluronic-serum": "vitamin-c-hyaluronic-acid-radiant-serum",
  "micro-moisturizer": "micro-sculpting-moisturizer",
  "vitamin-mist": "ultra-fine-hydration-mist",
};
