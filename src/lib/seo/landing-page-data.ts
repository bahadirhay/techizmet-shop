import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { descriptiveMediaUrl, loadMediaNameMap } from "@/lib/media-descriptive-url";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import { storefrontListedWhere } from "@/lib/storefront-product-where";
import {
  detectLandingIngredients,
  findLandingContent,
  type LandingCriterion,
  type LandingIngredient,
} from "@/lib/seo/landing-content";
import {
  findLandingIntentBySlug,
  mergeFaqsForPath,
  type SearchIntentFaq,
} from "@/lib/seo/search-intent";
import { getSiteSettings } from "@/lib/site-settings";

export type LandingProduct = {
  id: string;
  slug: string;
  /** Vitrin başlığı (gramaj/adet eklenmiş) */
  title: string;
  /** Boyutsuz görsel adresi (açıklayıcı ad ile); ?width= eklenebilir */
  imageUrl: string | null;
  badgesJson: string | null;
  stockQty: number;
  lowStockThreshold: number;
  priceMinor: number;
  compareAtMinor: number | null;
  /** "150 g", "2 adet" veya boş */
  packLabel: string;
  /** 100 g fiyatı (kuruş); gramaj yoksa null */
  per100gMinor: number | null;
  ingredients: LandingIngredient[];
};

export type LandingGroup = {
  title: string;
  text: string;
  link?: { label: string; href: string };
  products: LandingProduct[];
};

export type LandingPathCard = {
  label: string;
  href: string;
  text: string;
  imageUrl: string | null;
};

export type LandingPageData = {
  slug: string;
  canonicalPath: string;
  heading: string;
  brandName: string;
  /** Hero tek cümle — yoksa klasik H1+intro düzeni */
  heroLead: string | null;
  heroImageUrl: string | null;
  /** Hero CTA metni */
  ctaLabel: string;
  intro: string[];
  paths: LandingPathCard[];
  products: LandingProduct[];
  /** Hammadde bilgisi bulunan ürün var mı (tablodaki içerik/doku sütunları) */
  hasFacts: boolean;
  tableHeading: string;
  groups: LandingGroup[];
  criteriaHeading: string;
  criteria: LandingCriterion[];
  faqs: SearchIntentFaq[];
  guides: { title: string; href: string }[];
  relatedLinks: { label: string; href: string }[];
};

function packLabel(weightGrams: number | null, pieceCount: number | null): string {
  if (weightGrams && weightGrams > 0) {
    return weightGrams >= 1000
      ? `${String(weightGrams / 1000).replace(".", ",")} kg`
      : `${weightGrams} g`;
  }
  if (pieceCount && pieceCount > 0) return `${pieceCount} adet`;
  return "";
}

/**
 * Landing sayfasının ürünleri — sayfa, JSON-LD (ItemList) ve paylaşım görseli aynı listeyi kullanır.
 * Sayfanın kendi alt kümesi boş kalırsa (ör. başka katalog) tüm vitrin ürünleri gösterilir.
 */
export const loadLandingProducts = cache(async (slug: string): Promise<LandingProduct[]> => {
  const site = await getDefaultSite();
  const [rows, mediaNames] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId: site.id, ...storefrontListedWhere },
      orderBy: [{ title: "asc" }, { priceMinor: "asc" }],
      take: 60,
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        badgesJson: true,
        stockQty: true,
        lowStockThreshold: true,
        priceMinor: true,
        compareAtMinor: true,
        weightGrams: true,
        pieceCount: true,
        images: {
          where: { mediaType: "image" },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    }),
    loadMediaNameMap(),
  ]);

  const all: LandingProduct[] = rows.map((r) => {
    const rawImage = r.imageUrl?.trim() || r.images[0]?.url?.trim() || null;
    return {
      id: r.id,
      slug: r.slug,
      title: formatProductDisplayTitle({
        title: r.title,
        weightGrams: r.weightGrams,
        pieceCount: r.pieceCount,
      }),
      imageUrl: rawImage ? descriptiveMediaUrl(rawImage, mediaNames) : null,
      badgesJson: r.badgesJson,
      stockQty: r.stockQty,
      lowStockThreshold: r.lowStockThreshold,
      priceMinor: r.priceMinor,
      compareAtMinor: r.compareAtMinor,
      packLabel: packLabel(r.weightGrams, r.pieceCount),
      per100gMinor:
        r.weightGrams && r.weightGrams > 0
          ? Math.round((r.priceMinor * 100) / r.weightGrams)
          : null,
      ingredients: detectLandingIngredients(r.title),
    };
  });

  // Tek hammaddeliler önce, karışık paketler sonda; kendi içinde ada ve fiyata göre
  const ordered = all
    .map((p, index) => ({ p, index }))
    .sort((a, b) => {
      const mixA = a.p.ingredients.length > 1 ? 1 : 0;
      const mixB = b.p.ingredients.length > 1 ? 1 : 0;
      return mixA - mixB || a.index - b.index;
    })
    .map((x) => x.p);

  const filter = findLandingContent(slug)?.filter;
  if (!filter) return ordered;
  const subset = ordered.filter((p) => filter(p.ingredients));
  return subset.length ? subset : ordered;
});

/** Landing sayfasının tüm içeriği — sayfa bunu bekler ve akışsız (tek parça) HTML basar */
export async function loadLandingPageData(slug: string): Promise<LandingPageData | null> {
  const intent = findLandingIntentBySlug(slug);
  if (!intent) return null;
  const cleanSlug = slug.trim().toLowerCase();
  const def = findLandingContent(cleanSlug);
  const site = await getDefaultSite();

  const [products, posts] = await Promise.all([
    loadLandingProducts(cleanSlug),
    def?.blogSlugs.length
      ? prisma.storeBlogPost.findMany({
          where: { siteId: site.id, published: true, slug: { in: def.blogSlugs } },
          select: { slug: true, titleTr: true },
        })
      : Promise.resolve([]),
  ]);

  const postBySlug = new Map(posts.map((p) => [p.slug, p]));
  const guides = (def?.blogSlugs ?? [])
    .map((s) => postBySlug.get(s))
    .filter((p): p is { slug: string; titleTr: string } => Boolean(p))
    .map((p) => ({ title: p.titleTr, href: `/blogs/news/${p.slug}` }));

  const groups: LandingGroup[] = (def?.groups ?? [])
    .map((g) => ({
      title: g.title,
      text: g.text,
      link: g.link,
      products: products.filter((p) => g.filter(p.ingredients)),
    }))
    .filter((g) => g.products.length > 0);

  const relatedLinks: { label: string; href: string }[] = [];
  for (const relatedSlug of def?.related ?? []) {
    const related = findLandingIntentBySlug(relatedSlug);
    if (related && relatedSlug !== cleanSlug) {
      relatedLinks.push({
        label: related.h1 ?? related.query,
        href: `/collections/${relatedSlug}`,
      });
    }
  }
  relatedLinks.push({ label: "Tüm ürünler", href: "/collections/all" });

  const settings = await getSiteSettings(site.id);
  const overlay = settings.seo?.landingPages?.[cleanSlug];

  const heading =
    overlay?.heading?.trim() || intent.h1 || intent.query;
  const defaultHeroImage = products.find((p) => p.imageUrl)?.imageUrl ?? null;
  const heroImageUrl = overlay?.heroImageUrl?.trim() || defaultHeroImage;
  const heroLead = overlay?.heroLead?.trim() || def?.heroLead || null;
  const intro =
    overlay?.intro && overlay.intro.length > 0
      ? overlay.intro.map((p) => p.trim()).filter(Boolean)
      : def?.intro ?? [intent.description];
  const ctaLabel = overlay?.ctaLabel?.trim() || "Ürünleri gör";

  const paths: LandingPathCard[] = (def?.paths ?? []).map((path) => {
    const imageUrl =
      (path.imageIngredientKey
        ? products.find(
            (p) =>
              p.imageUrl &&
              p.ingredients.some((i) => i.key === path.imageIngredientKey),
          )?.imageUrl
        : null) ?? heroImageUrl;
    return {
      label: path.label,
      href: path.href,
      text: path.text,
      imageUrl,
    };
  });

  return {
    slug: cleanSlug,
    canonicalPath: `/collections/${cleanSlug}`,
    heading,
    brandName: site.name?.trim() || "Anatolian Paw",
    heroLead,
    heroImageUrl,
    ctaLabel,
    intro,
    paths,
    products,
    hasFacts: products.some((p) => p.ingredients.length > 0),
    tableHeading: def?.tableHeading ?? `${heading} karşılaştırma tablosu`,
    groups,
    criteriaHeading: def?.criteriaHeading ?? "Nasıl seçilir?",
    criteria: def?.criteria ?? [],
    // FAQPage JSON-LD ile aynı liste (collection-page-json-ld.ts)
    faqs: mergeFaqsForPath(`/collections/${cleanSlug}`),
    guides,
    relatedLinks,
  };
}

/** Landing sayfasının paylaşım (og:image) görseli — alt kümedeki ilk ürünün fotoğrafı */
export async function loadLandingHeroImage(slug: string): Promise<string | null> {
  const products = await loadLandingProducts(slug.trim().toLowerCase());
  return products.find((p) => p.imageUrl)?.imageUrl ?? null;
}
