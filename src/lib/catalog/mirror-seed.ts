import variantsJson from "@/lib/catalog/mirror-product-variants.json";
import collectionsJson from "@/lib/catalog/mirror-product-collections.json";
import { MIRROR_PRODUCTS, mirrorProductImage } from "@/lib/catalog/mirror-catalog";

export type MirrorVariantRow = {
  label: string;
  priceMinor: number;
  compareAtMinor?: number | null;
  isDefault: boolean;
};

export type MirrorProductSeed = {
  title: string;
  priceMinor: number;
  compareAtMinor: number | null;
  /** HTTrack og:image — örn. 6a9201.jpg */
  imageFile?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  keyFeaturesHtml?: string | null;
  howToUseHtml?: string | null;
  variantOptionName: string | null;
  variants: MirrorVariantRow[];
};

export const MIRROR_PRODUCT_VARIANTS = variantsJson as Record<string, MirrorProductSeed>;
export const MIRROR_PRODUCT_COLLECTIONS = collectionsJson as Record<string, string[]>;

const legacyImageBySlug = new Map<string, string | undefined>(
  MIRROR_PRODUCTS.map((p) => [p.slug, p.image]),
);

/** Ürün görseli: önce extract JSON (og:image), yoksa eski mirror-catalog */
export function mirrorSeedImageUrl(slug: string): string | null {
  const fromExtract = MIRROR_PRODUCT_VARIANTS[slug];
  if (fromExtract?.imageUrl) return fromExtract.imageUrl;
  if (fromExtract?.imageFile) return mirrorProductImage(fromExtract.imageFile);
  const legacy = legacyImageBySlug.get(slug);
  return legacy ? mirrorProductImage(legacy) : null;
}

/** Admin / vitrin için birincil koleksiyon (natural-glam öncelikli) */
export function mirrorPrimaryCollectionSlug(slugs: string[] | undefined, fallback: string): string {
  if (!slugs?.length) return fallback;
  if (slugs.includes("natural-glam")) return "natural-glam";
  const nonAll = slugs.filter((s) => s !== "all");
  return nonAll[0] ?? slugs[0] ?? fallback;
}

export function mirrorProductSlugsForSeed(): string[] {
  return Object.keys(MIRROR_PRODUCT_VARIANTS);
}
