import type { SiteSettings } from "@/lib/site-settings";

export type SearchIntentFaq = {
  question: string;
  answer: string;
};

export type SearchIntentTarget = {
  id: string;
  /** Google'da hedeflenen sorgu */
  query: string;
  /** Öncelikli landing URL */
  landingPath: string;
  /** staticPages anahtarı veya koleksiyon slug */
  landingKind: "staticPage" | "collection";
  staticPageKey?: string;
  collectionSlug?: string;
  title: string;
  description: string;
  h1?: string;
  faqs: SearchIntentFaq[];
  /** Ürün başlık/açıklamasında aranacak kelimeler */
  productKeywords: string[];
  /** Blog önerisi */
  suggestedBlogTitle?: string;
};

/** anatolianpaw.com — organik + AI arama hedefleri */
export const DEFAULT_SEARCH_INTENTS: SearchIntentTarget[] = [
  {
    id: "dog-natural-treat",
    query: "doğal köpek ödülü",
    landingPath: "/collections/all",
    landingKind: "staticPage",
    staticPageKey: "/collections/all",
    title: "Doğal Köpek Ödülü | Anatolian Paw",
    description:
      "Doğal köpek ödülü ve eğitim maması — tahılsız, katkısız, Türkiye üretimi. Kurutulmuş dana ciğer, akciğer ve kemik ödülleri 150–250 TL aralığında. Hızlı kargo, güvenilir içerik.",
    h1: "Doğal Köpek Ödülü",
    productKeywords: ["doğal", "köpek", "ödül", "ciğer", "akciğer", "kurutulmuş", "tahılsız", "eğitim"],
    suggestedBlogTitle: "Doğal Köpek Ödülü Nedir? 2026 Fiyat ve Seçim Rehberi",
    faqs: [
      {
        question: "Doğal köpek ödülü nedir?",
        answer:
          "Doğal köpek ödülü, yapay renklendirici, tahıl ve koruyucu içermeyen; tek protein kaynaklı kurutulmuş veya minimal işlem görmüş atıştırmalıklardır. Eğitim ve pozitif pekiştirmede kullanılır.",
      },
      {
        question: "Doğal köpek ödülü fiyatları ne kadar?",
        answer:
          "Anatolian Paw doğal köpek ödülleri genelde 150–250 TL aralığındadır. Gramaj ve proteine göre değişir; güncel fiyatlar ürün sayfalarında listelenir.",
      },
      {
        question: "Hangi köpekler için uygundur?",
        answer:
          "Yetişkin ve yavru köpekler için uygun ürünler ayrı etiketlenir. Tahılsız ve tek proteinli ödüller hassas sindirim ve alerji riski düşük beslenme tercih edenler için idealdir.",
      },
      {
        question: "Eğitim ödülü olarak nasıl kullanılır?",
        answer:
          "Küçük parçalara bölünerek kısa eğitim seanslarında verin. Günlük rasyonun %10'unu geçmeyecek şekilde ödül miktarını sınırlayın.",
      },
    ],
  },
  {
    id: "natural-dog-treat-price",
    query: "doğal köpek ödül maması fiyat",
    landingPath: "/collections/all",
    landingKind: "staticPage",
    staticPageKey: "/collections/all",
    title: "Doğal Köpek Ödül Maması Fiyatları | Anatolian Paw",
    description:
      "Doğal köpek ödül maması fiyatları 2026 — kurutulmuş organ etleri, kemik ve çiğneme ödülleri. TRY fiyat, stok ve kargo bilgisiyle online sipariş.",
    productKeywords: ["fiyat", "doğal", "ödül", "köpek", "mama"],
    faqs: [
      {
        question: "Doğal köpek ödül maması fiyatları neden değişir?",
        answer:
          "Protein türü (dana, kuzu), gramaj, kurutma yöntemi ve paket boyutuna göre fiyat değişir. Tek proteinli organ ödülleri genelde premium segmenttedir.",
      },
    ],
  },
];

export function getSearchIntents(_settings?: SiteSettings): SearchIntentTarget[] {
  return DEFAULT_SEARCH_INTENTS;
}

export function findIntentForPath(path: string): SearchIntentTarget | undefined {
  const normalized = path.split("?")[0] || path;
  return DEFAULT_SEARCH_INTENTS.find((i) => i.landingPath === normalized);
}
