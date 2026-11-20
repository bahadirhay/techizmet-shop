import "server-only";

import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";
import { getDefaultSite } from "@/lib/site";
import { findLandingIntentBySlug } from "@/lib/seo/search-intent";
import type {
  SeoContentCriterion,
  SeoContentFaq,
  SeoContentLink,
  SeoContentProduct,
} from "@/components/store/CollectionSeoContent";

/** Ana sayfadaki genel satın alma ölçütleri — yalnızca mağazada bulunan ürünlere dayanır */
const DEFAULT_CRITERIA: SeoContentCriterion[] = [
  {
    title: "Protein kaynağı",
    text: "Tek hammaddeli (dana akciğer, deve derisi gibi) ürünlerde köpeğinizin ne yediğini bilirsiniz; hassasiyet durumunda kaynağı ayırt etmek kolaylaşır.",
  },
  {
    title: "Tahılsız ve katkısız içerik",
    text: "Buğday, mısır ve yapay koruyucu içermeyen, içerik listesi kısa ürünleri tercih edin.",
  },
  {
    title: "Parça boyutu",
    text: "Eğitim için bir lokmada yutulabilen küçük parçalar; çiğneme ihtiyacı için daha sert ve büyük ürünler uygundur.",
  },
  {
    title: "Yaşa uygunluk",
    text: "Yavru ve yaşlı köpeklerde doku ve sertlik önemlidir; vermeden önce veterinerinize danışın.",
  },
  {
    title: "Üretim ve saklama",
    text: "Kurutulmuş, Türkiye üretimi ve içerik bilgisi açık ürünleri seçin; açıldıktan sonra 30 gün içinde tüketin.",
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

function productMatchesKeywords(
  title: string,
  description: string | null,
  keywords: string[],
): boolean {
  if (!keywords.length) return true;
  const hay = `${title} ${description ?? ""}`.toLocaleLowerCase("tr-TR");
  // En az 2 anahtar kelime eşleşsin — alakasız ürünleri ele
  const hits = keywords.filter((k) => hay.includes(k.toLocaleLowerCase("tr-TR"))).length;
  return hits >= Math.min(2, keywords.length);
}

async function loadTopProducts(
  siteId: string,
  opts?: { limit?: number; keywords?: string[] },
): Promise<SeoContentProduct[]> {
  const limit = opts?.limit ?? 12;
  const keywords = opts?.keywords?.filter(Boolean) ?? [];
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    take: keywords.length ? 80 : limit,
    select: { slug: true, title: true, priceMinor: true, description: true },
  });
  const filtered = keywords.length
    ? rows.filter((r) => productMatchesKeywords(r.title, r.description, keywords))
    : rows;
  return filtered.slice(0, limit).map((r) => ({
    name: r.title,
    slug: r.slug,
    priceMinor: r.priceMinor,
  }));
}

/**
 * Ana sayfa için taranabilir marka + head terim bloğu.
 * Adanmış landing sayfalarının içeriği ayrı üretilir: bkz. landing-page-data.ts.
 */
export async function loadHomeSeoContent(): Promise<CollectionSeoContentData | null> {
  const site = await getDefaultSite();
  const primary =
    findLandingIntentBySlug("kopek-odul-mamasi") ??
    findLandingIntentBySlug("dogal-kopek-odul-mamasi");
  if (!primary) return null;

  const faqs: SeoContentFaq[] = [
    {
      question: "Kurutulmuş köpek ödül maması nedir?",
      answer:
        "Kurutulmuş köpek ödül maması, tek hammaddenin (dana akciğer, deve derisi, dana gırtlak, kuzu paça veya tavuk ayağı) kurutulmasıyla hazırlanan, ana öğünün yerine geçmeyen ödüldür.",
    },
    {
      question: "Kurutulmuş ödül nasıl saklanır?",
      answer:
        "Serin, kuru ve doğrudan güneş almayan bir yerde saklayın. Paket açıldıktan sonra ağzını kapatın ve 30 gün içinde tüketin.",
    },
    {
      question: "Köpek ödül maması ile kurutulmuş ödül aynı sayfada mı?",
      answer:
        "Kurutulmuş ürünlerin tamamı ana sayfada özetlenir. Köpek ödül maması ve doğal köpek ödül maması için ayrı koleksiyon sayfaları vardır.",
    },
  ];
  const products = await loadTopProducts(site.id, {
    keywords: primary.productKeywords,
    limit: 10,
  });

  const heading = "Kurutulmuş Köpek Ödül Maması";
  const intro =
    `${site.name}, Türkiye'de üretilen kurutulmuş köpek ödül mamaları sunar. ` +
    `Tek hammaddeli ürünler dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağıdır. ` +
    `Köpek ödül maması ve doğal köpek ödül maması sayfalarından amaca göre seçim yapabilirsiniz.`;

  const relatedLinks: SeoContentLink[] = [
    { label: "Köpek Ödül Maması", href: "/collections/kopek-odul-mamasi" },
    { label: "Doğal Köpek Ödül Maması", href: "/collections/dogal-kopek-odul-mamasi" },
    { label: "Köpek Eğitim Ödül Maması", href: "/collections/kopek-egitim-odul-mamasi" },
    { label: "Köpek Çiğneme Ürünleri", href: "/collections/kopek-cigneme-urunleri" },
    { label: "Dana Akciğer Köpek Ödülü", href: "/collections/dana-akciger-kopek-odulu" },
    { label: "Deve Derisi Köpek Ödülü", href: "/collections/deve-derisi-kopek-odulu" },
    { label: "Dana Gırtlak Köpek Ödülü", href: "/collections/dana-girtlak-kopek-odulu" },
    { label: "Tüm ürünler", href: "/collections/all" },
    { label: "Rehber yazılar", href: "/blogs/news" },
  ];

  return { heading, intro, criteria: DEFAULT_CRITERIA, products, faqs, relatedLinks };
}
