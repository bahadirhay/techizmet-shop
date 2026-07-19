import "server-only";

import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";
import { getDefaultSite } from "@/lib/site";
import {
  findIntentForPath,
  findLandingIntentBySlug,
  mergeFaqsForPath,
} from "@/lib/seo/search-intent";
import type {
  SeoContentCriterion,
  SeoContentFaq,
  SeoContentLink,
  SeoContentProduct,
} from "@/components/store/CollectionSeoContent";

/** Doğal köpek ödülü kategorisinde tüm head terimler için geçerli satın alma kriterleri */
const DEFAULT_CRITERIA: SeoContentCriterion[] = [
  {
    title: "Protein kaynağı",
    text: "Tek proteinli (dana ciğer, akciğer gibi) ürünler hassas sindirim ve alerji riski düşük beslenme için daha güvenlidir.",
  },
  {
    title: "Tahılsız ve katkısız içerik",
    text: "Buğday, mısır ve yapay koruyucu içermeyen, içerik listesi kısa ürünleri tercih edin.",
  },
  {
    title: "Parça boyutu",
    text: "Eğitim için bir lokmada yutulabilen küçük parçalar; çiğneme ihtiyacı için orta-büyük boy uygundur.",
  },
  {
    title: "Yaşa uygunluk",
    text: "Yavru, yetişkin ve yaşlı köpekler için doku ve sertlik farklıdır; etikette yaş önerisini kontrol edin.",
  },
  {
    title: "Üretim ve tazelik",
    text: "Düşük ısıda kurutulmuş, Türkiye üretimi ve net içerik/üretim bilgisi olan ürünleri seçin.",
  },
];

export type CollectionSeoContentData = {
  heading: string;
  intro: string;
  criteria: SeoContentCriterion[];
  products: SeoContentProduct[];
  faqs: SeoContentFaq[];
  relatedLinks: SeoContentLink[];
};

async function loadTopProducts(siteId: string, limit = 12): Promise<SeoContentProduct[]> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    take: limit,
    select: { slug: true, title: true, priceMinor: true },
  });
  return rows.map((r) => ({ name: r.title, slug: r.slug, priceMinor: r.priceMinor }));
}

/**
 * Verilen kanonik yol için taranabilir içerik bloğu verisini hazırlar.
 * relatedLinks ile head terim landing sayfaları arasında iç link grafiği kurar.
 */
export async function loadCollectionSeoContent(
  canonicalPath: string,
  opts?: { includeProducts?: boolean },
): Promise<CollectionSeoContentData | null> {
  const intent = findIntentForPath(canonicalPath);
  if (!intent) return null;

  const site = await getDefaultSite();
  const faqs = mergeFaqsForPath(canonicalPath);
  const products = opts?.includeProducts ? await loadTopProducts(site.id) : [];

  const heading = intent.h1 ?? intent.query;
  const intro =
    `${heading} arıyorsanız ${site.name} koleksiyonunda doğal, tahılsız ve katkısız seçenekleri inceleyebilirsiniz. ` +
    intent.description;

  const relatedLinks: SeoContentLink[] = [];
  const currentSlug = canonicalPath.replace("/collections/", "").split("?")[0];
  const landingTargets: { slug: string; label: string }[] = [
    { slug: "odul-mamasi", label: "Ödül Maması" },
    { slug: "kopek-odul-mamasi", label: "Köpek Ödül Maması" },
    { slug: "dogal-kopek-odul-mamasi", label: "Doğal Köpek Ödül Maması" },
    { slug: "dogal-kopek-odulu", label: "Doğal Köpek Ödülü" },
  ];
  for (const t of landingTargets) {
    if (t.slug !== currentSlug && findLandingIntentBySlug(t.slug)) {
      relatedLinks.push({ label: t.label, href: `/collections/${t.slug}` });
    }
  }
  if (canonicalPath !== "/collections/all") {
    relatedLinks.push({ label: "Tüm ürünler", href: "/collections/all" });
  }

  return { heading, intro, criteria: DEFAULT_CRITERIA, products, faqs, relatedLinks };
}
