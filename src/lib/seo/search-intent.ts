/**
 * Client-safe module: do NOT import from site-settings (even as type).
 * Turbopack can follow type-only imports into prisma → tenant-context → node:async_hooks
 * and break client bundles (BundleForm / ProductSeoHealthPanel).
 */
export type SearchIntentFaq = {
  question: string;
  answer: string;
};

export type SearchIntentTarget = {
  id: string;
  /** Google'da hedeflenen sorgu */
  query: string;
  /** Düşük sayı = öncelikli landing meta önerisi */
  priority?: number;
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

const LANDING_ALL = "/collections/all";
/** Head terimler için adanmış landing sayfaları (kendi URL + H1 + içerik) */
const LANDING_DOGAL_KOPEK_ODULU = "/collections/dogal-kopek-odulu";
const LANDING_KOPEK_ODUL_MAMASI = "/collections/kopek-odul-mamasi";
const LANDING_DOGAL_KOPEK_ODUL_MAMASI = "/collections/dogal-kopek-odul-mamasi";
const LANDING_ODUL_MAMASI = "/collections/odul-mamasi";
/** Kullanım amacına göre landing sayfaları — kendi ürün alt kümesi (bkz. landing-content.ts) */
const LANDING_KOPEK_EGITIM_ODUL_MAMASI = "/collections/kopek-egitim-odul-mamasi";
const LANDING_KOPEK_CIGNEME_URUNLERI = "/collections/kopek-cigneme-urunleri";

/**
 * Google'da öncelikli 3 hedef sorgu — admin Google Sıralama paneli + ana sayfa meta.
 * Sıra = iş önceliği.
 */
export const PRIMARY_GOOGLE_KEYWORD_IDS = [
  "dog-treat-food",
  "treat-food",
  "natural-dog-treat-food",
] as const;

/** anatolianpaw.com — organik + AI arama hedefleri */
export const DEFAULT_SEARCH_INTENTS: SearchIntentTarget[] = [
  {
    id: "dog-natural-treat",
    query: "doğal köpek ödülü",
    priority: 3,
    landingPath: LANDING_DOGAL_KOPEK_ODULU,
    landingKind: "collection",
    collectionSlug: "dogal-kopek-odulu",
    title: "Doğal Köpek Ödülü | Kurutulmuş, Katkısız Ödüller | Anatolian Paw",
    description:
      "Doğal köpek ödülü çeşitleri protein kaynağına göre: dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. Kurutulmuş, tahılsız ve katkısız; saklama ve kullanım bilgisiyle.",
    h1: "Doğal Köpek Ödülü",
    productKeywords: ["doğal", "köpek", "ödül", "akciğer", "kurutulmuş", "tahılsız", "eğitim"],
    suggestedBlogTitle: "Doğal Köpek Ödülü Nedir? 2026 Fiyat ve Seçim Rehberi",
    faqs: [
      {
        question: "Doğal köpek ödülü hangi hammaddelerden yapılır?",
        answer:
          "Anatolian Paw doğal köpek ödülleri dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağından üretilir. Her üründe içerik, ürün adında yazan hammaddedir; tahıl, renklendirici veya koruyucu eklenmez.",
      },
      {
        question: "Kurutulmuş köpek ödülü nasıl saklanır?",
        answer:
          "Serin, kuru ve doğrudan güneş almayan bir yerde saklayın. Paket açıldıktan sonra ağzını kapatın ve 30 gün içinde tüketin.",
      },
      {
        question: "Sığır etine hassasiyeti olan köpek için hangi ödül seçilir?",
        answer:
          "Dana kaynaklı olmayan seçenekler deve derisi, kuzu paça ve tavuk ayağıdır. Yeni bir proteini küçük miktarla deneyin; bilinen bir alerji varsa önce veterinerinize danışın.",
      },
      {
        question: "Doğal köpek ödülü ile köpek ödül maması aynı şey mi?",
        answer:
          "Evet, günlük kullanımda iki ifade aynı ürünleri anlatır: ana öğünün yerine geçmeyen, eğitimde ve ödüllendirmede verilen atıştırmalıklar.",
      },
    ],
  },
  {
    id: "dog-treat-food",
    query: "köpek ödül maması",
    priority: 1,
    landingPath: LANDING_KOPEK_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "kopek-odul-mamasi",
    title: "Köpek Ödül Maması | Doğal ve Tahılsız | Anatolian Paw",
    description:
      "Köpek ödül maması çeşitleri: kurutulmuş dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. Gramaj ve fiyat karşılaştırması, kullanım amacına göre seçim. Tahılsız, katkısız, Türkiye üretimi.",
    h1: "Köpek Ödül Maması",
    productKeywords: ["köpek", "ödül", "mama", "doğal", "kurutulmuş", "eğitim", "tahılsız"],
    suggestedBlogTitle: "Köpek Ödül Maması Seçerken Nelere Dikkat Edilmeli?",
    faqs: [
      {
        question: "Köpek ödül maması nedir?",
        answer:
          "Köpek ödül maması, ana öğün yerine geçmeyen; eğitim, ödüllendirme ve çiğneme ihtiyacı için verilen atıştırmalık ve kurutulmuş et ürünleridir.",
      },
      {
        question: "Ödül maması ile ana mama arasındaki fark nedir?",
        answer:
          "Ana mama günlük beslenme ihtiyacını karşılar; ödül maması küçük porsiyonlarda verilir, tam ve dengeli bir öğün değildir ve ana mamanın yerine geçmez.",
      },
      {
        question: "Günde ne kadar köpek ödül maması verilmeli?",
        answer:
          "Veteriner önerisiyle günlük kalorinin en fazla %10'u ödül olarak verilebilir. Eğitim seanslarında küçük parçalar tercih edin.",
      },
      {
        question: "Hangi köpek ödül maması daha sağlıklı?",
        answer:
          "İçerik listesi kısa, tek hammaddeli, tahıl ve katkı içermeyen kurutulmuş ödüller (dana akciğer, deve derisi gibi) genelde daha güvenli bir seçimdir. Köpeğinizin özel bir sağlık durumu varsa veterinerinize danışın.",
      },
      {
        question: "Köpek ödül maması fiyatları ne kadar?",
        answer:
          "Fiyat gramaja ve hammaddeye göre değişir. Güncel fiyatlar ürün sayfalarında ve köpek ödül maması sayfasındaki karşılaştırma tablosunda yer alır.",
      },
    ],
  },
  {
    id: "treat-food",
    query: "ödül maması",
    priority: 1,
    landingPath: LANDING_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "odul-mamasi",
    title: "Ödül Maması | Köpekler İçin Doğal Ödül Maması Türleri | Anatolian Paw",
    description:
      "Köpekler için ödül maması türleri: eğitimde küçük parçalara bölünen akciğer ödülleri, uzun süre çiğnenen deve derisi ve kuzu paça, karışık paketler. Doğal, tahılsız ve katkısız.",
    h1: "Ödül Maması",
    productKeywords: ["ödül", "mama", "köpek", "doğal", "kurutulmuş", "eğitim", "tahılsız"],
    suggestedBlogTitle: "Ödül Maması Nedir? Köpekler İçin Doğru Seçim Rehberi",
    faqs: [
      {
        question: "Ödül maması nedir?",
        answer:
          "Ödül maması, köpeklerin eğitim ve ödüllendirilmesinde kullanılan; ana öğünün yerine geçmeyen atıştırmalık ve kurutulmuş et ürünleridir. Doğal ödül maması katkısız ve tahılsız formülleri tercih eder.",
      },
      {
        question: "Ödül maması köpekler için mi?",
        answer:
          "Bu mağazadaki ödül mamalarının tamamı köpekler içindir. Eğitim ödül mamaları ve çiğneme ürünleri sayfalarında kullanım amacına göre ayrılmış ürünleri görebilirsiniz.",
      },
      {
        question: "Ödül maması ile köpek maması aynı mı?",
        answer:
          "Hayır. Köpek maması (ana mama) günlük beslenmeyi karşılar; ödül maması küçük porsiyonlarda eğitim ve ödüllendirme içindir.",
      },
      {
        question: "En iyi ödül maması nasıl seçilir?",
        answer:
          "Tek proteinli, tahılsız, kısa içerik listeli ve Türkiye üretimi ürünleri tercih edin. Eğitim için küçük parçalar, çiğneme için orta-büyük boy uygundur.",
      },
    ],
  },
  {
    id: "natural-dog-treat-food",
    query: "doğal köpek ödül maması",
    priority: 1,
    landingPath: LANDING_DOGAL_KOPEK_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "dogal-kopek-odul-mamasi",
    title: "Doğal Köpek Ödül Maması | Tahılsız & Katkısız | Anatolian Paw",
    description:
      "Doğal köpek ödül maması: tek hammaddeli kurutulmuş dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. İçerik listesi tek satır; tahıl, renklendirici ve koruyucu yok. Türkiye üretimi.",
    h1: "Doğal Köpek Ödül Maması",
    productKeywords: ["doğal", "köpek", "ödül", "mama", "kurutulmuş", "tahılsız", "akciğer"],
    suggestedBlogTitle: "Doğal Köpek Ödül Maması Rehberi: İçerik, Fayda ve Seçim",
    faqs: [
      {
        question: "Doğal köpek ödül maması nedir?",
        answer:
          "Doğal köpek ödül maması; yapay renklendirici, tahıl ve koruyucu içermeyen, tek hammaddeden (dana akciğer, deve derisi gibi) kurutularak üretilen ödül ürünleridir. Eğitim ve pozitif pekiştirmede kullanılır.",
      },
      {
        question: "Doğal köpek ödül maması ile işlenmiş ödül arasındaki fark nedir?",
        answer:
          "Doğal ödüller kısa içerik listesine sahiptir ve katkı maddesi içermez; işlenmiş ödüllerde ise nişasta, şeker, renklendirici ve koruyucu bulunabilir. Doğal ödüller hassas sindirim için daha güvenli kabul edilir.",
      },
      {
        question: "Doğal köpek ödül maması fiyatları ne kadar?",
        answer:
          "Fiyat hammaddeye ve gramaja göre değişir. Güncel fiyatlar ürün sayfalarında ve doğal köpek ödül maması sayfasındaki tabloda yer alır.",
      },
      {
        question: "Hangi köpekler için uygundur?",
        answer:
          "Yetişkin köpekler için uygundur. Yavru köpeklerde ve özel diyet uygulanan köpeklerde vermeden önce veterinerinize danışın.",
      },
    ],
  },
  {
    id: "dog-treat",
    query: "köpek ödülü",
    priority: 3,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Köpek Ödülü | Kurutulmuş Doğal Atıştırmalıklar | Anatolian Paw",
    description:
      "Köpek ödülü çeşitleri — dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. Eğitim ve davranış ödüllendirmesi için doğal, tahılsız seçenekler. Türkiye üretimi, hızlı teslimat.",
    h1: "Köpek Ödülü",
    productKeywords: ["köpek", "ödül", "akciğer", "çiğneme", "doğal"],
    suggestedBlogTitle: "En İyi Köpek Ödülü Türleri: Eğitim ve Sağlık Rehberi",
    faqs: [
      {
        question: "Köpek ödülü ne işe yarar?",
        answer:
          "Eğitimde komut pekiştirme, sosyalleşme, tırnak kesimi ve veteriner ziyaretlerinde pozitif deneyim oluşturmak için kullanılır.",
      },
      {
        question: "Yavru köpeğe ödül verilir mi?",
        answer:
          "Dişleri gelişmiş yavru köpeklere küçük, yumuşak ödüller verilebilir. Yaşa uygun ürün etiketini kontrol edin.",
      },
      {
        question: "Köpek ödülü saklama koşulları nelerdir?",
        answer:
          "Serin ve kuru ortamda, hava almayan ambalajda saklayın. Açıldıktan sonra tüketim süresine dikkat edin.",
      },
    ],
  },
  {
    id: "natural-dog-treat-price",
    query: "doğal köpek ödül maması fiyat",
    priority: 4,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Doğal Köpek Ödül Maması Fiyatları | Anatolian Paw",
    description:
      "Doğal köpek ödül maması fiyatları 2026 — kurutulmuş dana akciğer, deve derisi, kuzu paça ve diğer doğal ödüller. TRY fiyat, stok ve kargo bilgisiyle online sipariş.",
    h1: "Doğal Köpek Ödül Maması Fiyatları",
    productKeywords: ["fiyat", "doğal", "ödül", "köpek", "mama", "kurutulmuş"],
    suggestedBlogTitle: "Doğal Köpek Ödül Maması Fiyatları 2026 Karşılaştırması",
    faqs: [
      {
        question: "Doğal köpek ödül maması fiyatları neden değişir?",
        answer:
          "Protein türü (dana, deve, kuzu, tavuk), gramaj ve paket boyutuna göre fiyat değişir.",
      },
      {
        question: "Doğal ödül maması fiyatı nereden öğrenilir?",
        answer:
          "Her ürünün güncel fiyatı ürün sayfasında ve köpek ödül maması sayfasındaki karşılaştırma tablosunda görünür; kampanya ve paket boyutuna göre değişebilir.",
      },
      {
        question: "Toplu alımda indirim var mı?",
        answer:
          "Sepet ve kampanya dönemlerinde paket avantajları olabilir; güncel fiyatlar ödeme öncesi sepette netleşir.",
      },
    ],
  },
  {
    id: "dog-treat-food-price",
    query: "köpek ödül maması fiyat",
    priority: 5,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Köpek Ödül Maması Fiyatları 2026 | Anatolian Paw",
    description:
      "Köpek ödül maması fiyat listesi — dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. Güncel TRY fiyat, stok durumu ve ücretsiz kargo eşiği bilgisiyle hemen sipariş verin.",
    h1: "Köpek Ödül Maması Fiyatları",
    productKeywords: ["köpek", "ödül", "mama", "fiyat", "akciğer"],
    faqs: [
      {
        question: "Köpek ödül maması fiyatları neye göre belirlenir?",
        answer:
          "Hammadde, kurutma süreci, gramaj ve üretim maliyetine göre fiyat oluşur.",
      },
      {
        question: "En ucuz köpek ödül maması hangisi?",
        answer:
          "Küçük gramajlı paketler giriş seviyesi fiyat sunar; ürünü fiyata göre değil içerik listesine göre değerlendirin.",
      },
      {
        question: "Fiyatlar KDV dahil mi?",
        answer:
          "Mağazada görünen ürün fiyatları Türkiye e-ticaret düzenine uygun şekilde listelenir; ödeme adımında toplam net gösterilir.",
      },
    ],
  },
  {
    id: "dog-training-treat",
    query: "köpek eğitim ödül maması",
    priority: 2,
    landingPath: LANDING_KOPEK_EGITIM_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "kopek-egitim-odul-mamasi",
    title: "Köpek Eğitim Ödül Maması | Küçük Parça, Doğal | Anatolian Paw",
    description:
      "Köpek eğitim ödül maması: elle küçük parçalara bölünen kurutulmuş dana akciğer ve akciğerli karışık paketler. Tahılsız, katkısız; eğitimde parça boyutu ve günlük miktar önerileriyle.",
    h1: "Köpek Eğitim Ödül Maması",
    productKeywords: ["eğitim", "köpek", "ödül", "akciğer", "doğal", "mama"],
    suggestedBlogTitle: "Köpek Eğitim Ödülü Nasıl Seçilir? Eğitmen Önerileri",
    faqs: [
      {
        question: "Eğitim için hangi Anatolian Paw ürünü uygun?",
        answer:
          "Kurutulmuş dana akciğer hafif ve gevrek olduğu için elle küçük parçalara ayrılır; küçük ve büyük paket seçenekleri vardır. Akciğerli karışık paketler de eğitimde kullanılabilir.",
      },
      {
        question: "Eğitim ödülü nasıl olmalı?",
        answer:
          "Küçük, yumuşak veya kolay kırılabilir; köpeğin bir lokmada yutabileceği boyutta olmalı. Yüksek koku motivasyonu artırır.",
      },
      {
        question: "Eğitimde hangi ödül daha etkili?",
        answer:
          "Köpeğinizin en çok sevdiği yüksek değerli ödül (genelde et bazlı kurutulmuş ürünler) kısa seanslarda daha etkilidir.",
      },
      {
        question: "Eğitim ödülü ana öğünü etkiler mi?",
        answer:
          "Evet; verilen ödül kalorisini günlük mama miktarından düşün. Aşırı ödül kilo alımına yol açabilir.",
      },
    ],
  },
  {
    id: "dried-dog-treat",
    query: "kurutulmuş köpek ödülü",
    priority: 7,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Kurutulmuş Köpek Ödülü | Dana Akciğer, Deve Derisi, Kuzu Paça | Anatolian Paw",
    description:
      "Kurutulmuş köpek ödülü — kurutulmuş dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı. Uzun raf ömrü, yoğun lezzet, tahılsız içerik. Türkiye'de üretim, güvenilir kaynak.",
    h1: "Kurutulmuş Köpek Ödülü",
    productKeywords: ["kurutulmuş", "köpek", "ödül", "akciğer", "dana", "doğal"],
    suggestedBlogTitle: "Kurutulmuş Köpek Ödülü: Faydaları ve Saklama İpuçları",
    faqs: [
      {
        question: "Kurutulmuş köpek ödülü sağlıklı mı?",
        answer:
          "Katki ve tahıl eklenmemiş, tek protein kaynaklı kurutulmuş ödüller doğal beslenme yaklaşımına uygundur. Aşırı tüketimden kaçının.",
      },
      {
        question: "Kurutulmuş ödül nasıl üretilir?",
        answer:
          "Et düşük ısıda uzun süre kurutularak nemi alınır; böylece koruyucu maddeye gerek kalmadan raf ömrü uzar.",
      },
      {
        question: "Kurutulmuş akciğer ödülü kimler için?",
        answer:
          "Eğitim ödülü arayanlar için uygundur; hafif olduğu için küçük parçalara bölünür. Özel diyet uygulanan köpeklerde veterinere danışın.",
      },
    ],
  },
  {
    id: "lung-dog-treat",
    query: "akciğer köpek ödülü",
    priority: 9,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Akciğer Köpek Ödülü | Hafif ve Lezzetli | Anatolian Paw",
    description:
      "Akciğer köpek ödülü — hafif yapılı, kolay çiğnenen kurutulmuş dana akciğer. Elle küçük parçalara bölünür; eğitim ve günlük ödül için farklı paket boyutları. Tahılsız, katkısız Türkiye üretimi.",
    h1: "Akciğer Köpek Ödülü",
    productKeywords: ["akciğer", "köpek", "ödül", "kurutulmuş", "doğal", "dana"],
    faqs: [
      {
        question: "Akciğer ödülü hangi köpekler için uygundur?",
        answer:
          "Hafif ve gevrek dokusu sayesinde küçük ırklarda da sık tercih edilir; parça boyutunu köpeğinize göre ayarlayın. Yavru köpeklerde önce veterinerinize danışın.",
      },
      {
        question: "Akciğer ödülü eğitimde kullanılır mı?",
        answer:
          "Evet; kurutulmuş dana akciğer elle kolayca küçük parçalara ayrıldığı için eğitim seanslarında pratik bir ödüldür.",
      },
      {
        question: "Akciğer ödülü nasıl saklanır?",
        answer:
          "Orijinal ambalajında serin ve kuru yerde muhafaza edin; nem alan ürünleri tüketmeyin.",
      },
    ],
  },
  {
    id: "grain-free-dog-treat",
    query: "tahılsız köpek ödülü",
    priority: 10,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Tahılsız Köpek Ödülü | Tek Protein, Doğal | Anatolian Paw",
    description:
      "Tahılsız köpek ödülü — buğday, mısır ve gluten içermeyen kurutulmuş et ödülleri. Hassas sindirim ve tahıl intoleransı olan köpekler için. %100 et içerikli seçenekler.",
    h1: "Tahılsız Köpek Ödülü",
    productKeywords: ["tahılsız", "köpek", "ödül", "doğal", "gluten", "akciğer", "kurutulmuş"],
    suggestedBlogTitle: "Tahılsız Köpek Ödülü: Kimler İçin Gerekli?",
    faqs: [
      {
        question: "Tahılsız ödül ne demek?",
        answer:
          "Buğday, arpa, mısır gibi tahıl bileşenleri içermeyen; yalnızca et veya organ proteininden oluşan ödüllerdir.",
      },
      {
        question: "Tahılsız ödül alerji için yeterli mi?",
        answer:
          "Tahılsız olmak protein alerjisini çözmez; tek proteinli ürün seçip yeni ödülü kademeli deneyin.",
      },
      {
        question: "Tahılsız köpek ödülü fiyatları",
        answer:
          "Et bazlı tahılsız ödüller genelde tahıllı bisküvilere göre daha yüksek protein sunduğu için fiyat farkı oluşabilir.",
      },
    ],
  },
  {
    id: "dog-chew-bone",
    query: "köpek çiğneme ürünleri",
    priority: 2,
    landingPath: LANDING_KOPEK_CIGNEME_URUNLERI,
    landingKind: "collection",
    collectionSlug: "kopek-cigneme-urunleri",
    title: "Köpek Çiğneme Ürünleri | Doğal Çiğneme Ödülleri | Anatolian Paw",
    description:
      "Köpek çiğneme ürünleri: kurutulmuş deve derisi, dana gırtlak, kuzu paça ve tavuk ayağı. Çiğneme kemiğine doğal alternatifler; boyuta göre seçim ve güvenli kullanım önerileriyle.",
    h1: "Köpek Çiğneme Ürünleri",
    productKeywords: ["çiğneme", "köpek", "ödül", "doğal", "deve", "paça", "gırtlak"],
    suggestedBlogTitle: "Köpek Çiğneme Kemiği Seçimi: Güvenlik ve Irk Rehberi",
    faqs: [
      {
        question: "Köpek çiğneme ürünleri ne işe yarar?",
        answer:
          "Çiğneme içgüdüsünü karşılar, köpeği meşgul eder ve eşyaları kemirme isteğini azaltmaya yardımcı olur.",
      },
      {
        question: "Çiğneme kemiği yerine ne verilebilir?",
        answer:
          "Kurutulmuş deve derisi, dana gırtlak, kuzu paça ve tavuk ayağı tek hammaddeli doğal çiğneme seçenekleridir.",
      },
      {
        question: "Yavru köpeğe çiğneme ürünü verilir mi?",
        answer:
          "Yavru köpeklerde vermeden önce veterinerinize danışın; sert ürünlerden kaçının ve çiğnerken yanında bulunun.",
      },
      {
        question: "Çiğneme ürünü ne kadar süre verilmeli?",
        answer:
          "Yutabileceği kadar küçülen parçayı alın ve köpeğinizi çiğnerken gözetimsiz bırakmayın. Yanında her zaman temiz su bulunsun.",
      },
    ],
  },
  {
    id: "puppy-treat",
    query: "yavru köpek ödülü",
    priority: 12,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Yavru Köpek Ödülü | Küçük Boy, Yumuşak Doku | Anatolian Paw",
    description:
      "Yavru köpek ödülü — küçük parça, kolay çiğnenebilir kurutulmuş et snackleri. Sosyalleşme ve temel eğitim için doğal tahılsız ödüller. Yaşa uygun gramaj ve güvenli içerik.",
    h1: "Yavru Köpek Ödülü",
    productKeywords: ["yavru", "köpek", "ödül", "eğitim", "doğal", "mama"],
    suggestedBlogTitle: "Yavru Köpek Ödülü Rehberi: İlk Eğitim Adımları",
    faqs: [
      {
        question: "Yavru köpeğe ne zaman ödül verilir?",
        answer:
          "Temel komut öğrenimine başladığınızda küçük ödüllerle pozitif pekiştirme yapılabilir. Hangi yaşta hangi ödüle başlanacağını veterinerinize danışın.",
      },
      {
        question: "Yavru için hangi ödül boyutu?",
        answer:
          "Nohut büyüklüğünde veya daha küçük parçalar idealdir; boğulma riskine karşı büyük parçalardan kaçının.",
      },
      {
        question: "Yavru köpek ödülü kaç kez verilir?",
        answer:
          "Kısa eğitim seanslarında sık ama çok küçük miktarlarda verin; günlük toplam ödül kalorisini takip edin.",
      },
    ],
  },
  {
    id: "organ-dog-treat",
    query: "organ köpek ödülü",
    priority: 13,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Organ Köpek Ödülü | Dana Akciğer ve Dana Gırtlak | Anatolian Paw",
    description:
      "Organ köpek ödülü — kurutulmuş dana akciğer ve dana gırtlak. Tek hammaddeli, doğal kaynaklı, tahılsız. Eğitim ve çeşitlilik için tamamlayıcı ödül.",
    h1: "Organ Köpek Ödülü",
    productKeywords: ["organ", "köpek", "ödül", "gırtlak", "akciğer", "doğal", "kurutulmuş"],
    faqs: [
      {
        question: "Organ ödülü nedir?",
        answer:
          "Dana akciğer ve dana gırtlak gibi sakatat kaynaklı, kurutularak üretilen köpek atıştırmalıklarıdır.",
      },
      {
        question: "Organ ödülü her köpek için uygun mu?",
        answer:
          "Çoğu sağlıklı köpek için uygundur; özel diyet veya organ hassasiyeti varsa veterinere danışın.",
      },
      {
        question: "Organ ödülü ile normal ödül farkı",
        answer:
          "Organ etleri vitamin ve mineral açısından yoğundur; ana mama çeşitliliğine ek tamamlayıcı ödül olarak kullanılır.",
      },
    ],
  },
  {
    id: "natural-dog-snack",
    query: "doğal köpek atıştırmalığı",
    priority: 14,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Doğal Köpek Atıştırmalığı | Katkısız Et Ödülleri | Anatolian Paw",
    description:
      "Doğal köpek atıştırmalığı — renklendirici ve yapay aroma içermeyen kurutulmuş et ürünleri. Günlük ödül ve çiğneme ihtiyacı için güvenilir Türk üretimi. Online mağaza, hızlı teslimat.",
    h1: "Doğal Köpek Atıştırmalığı",
    productKeywords: ["doğal", "atıştırmalık", "köpek", "ödül", "kurutulmuş", "tahılsız"],
    faqs: [
      {
        question: "Doğal atıştırmalık nasıl anlaşılır?",
        answer:
          "İçerik listesinde tanıdık et isimleri, kısa bileşen sayısı ve yapay koruyucu/renklendirici olmaması iyi işarettir.",
      },
      {
        question: "Atıştırmalık ile ödül aynı mı?",
        answer:
          "Günlük dilde aynı kategoride kullanılır; ikisi de ana öğün dışında verilen snack ürünlerdir.",
      },
      {
        question: "Doğal köpek atıştırmalığı kaç kalori?",
        answer:
          "Ürüne göre değişir; paket etiketindeki besin değerlerini ve önerilen günlük miktarı kontrol edin.",
      },
    ],
  },
];

function intentPriority(intent: SearchIntentTarget): number {
  return intent.priority ?? 100;
}

export function getSearchIntents(_settings?: unknown): SearchIntentTarget[] {
  return DEFAULT_SEARCH_INTENTS;
}

/** Google'da öncelikli 3 hedef (Köpek Ödül Maması, Ödül maması, Doğal Köpek Ödül Maması) */
export function getPrimaryGoogleIntents(settings?: unknown): SearchIntentTarget[] {
  const all = getSearchIntents(settings);
  const byId = new Map(all.map((i) => [i.id, i]));
  return PRIMARY_GOOGLE_KEYWORD_IDS.map((id) => byId.get(id)).filter(
    (i): i is SearchIntentTarget => Boolean(i),
  );
}

/** Adanmış landing sayfası olan (collection-kind) hedeflerin slug'larını döner */
export const LANDING_COLLECTION_SLUGS: string[] = DEFAULT_SEARCH_INTENTS.filter(
  (i) => i.landingKind === "collection" && Boolean(i.collectionSlug),
).map((i) => i.collectionSlug as string);

/**
 * Blog yazısı slug → FAQ eşleşmesi.
 * Blog post page'de FAQPage schema enjekte etmek için kullanılır.
 */
const BLOG_SLUG_FAQ_MAP: Record<string, SearchIntentFaq[]> = {
  // Gerçek yayınlanan slug'lar (seed + production)
  "kopek-odul-mamasi-nasil-secilir":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-treat-food")?.faqs ?? [],
  "kopek-odul-mamasi-gunluk-kalori":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-treat-food")?.faqs ?? [],
  "yavru-kopeklere-odul-mamasi":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "treat-food")?.faqs ?? [],
  "freeze-dried-odul-mamasi":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "natural-dog-treat-food")?.faqs ?? [],
  "alerjik-kopek-odul-mamasi":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "natural-dog-treat-food")?.faqs ?? [],
  "ev-yapimi-kopek-odulu":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-natural-treat")?.faqs ?? [],
  "kopek-egitimi-odul-zamanlama":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-training-treat")?.faqs ?? [],
  // Eski önerilen slug'lar (geriye dönük)
  "dogal-kopek-odulu-nedir":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-natural-treat")?.faqs ?? [],
  "dogal-kopek-odul-mamasi-rehberi":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "natural-dog-treat-food")?.faqs ?? [],
  "kopek-odul-mamasi-secimi":
    DEFAULT_SEARCH_INTENTS.find((i) => i.id === "dog-treat-food")?.faqs ?? [],
  "odul-mamasi-nedir": DEFAULT_SEARCH_INTENTS.find((i) => i.id === "treat-food")?.faqs ?? [],
};

/** Blog yazısı slug'ı için FAQPage schema'da kullanılacak S/C listesini döner */
export function findFaqsForBlogSlug(slug: string): SearchIntentFaq[] {
  return BLOG_SLUG_FAQ_MAP[slug.trim().toLowerCase()] ?? [];
}

/** /collections/<slug> için adanmış landing intent'ini bulur */
export function findLandingIntentBySlug(slug: string): SearchIntentTarget | undefined {
  const clean = slug.trim().toLowerCase();
  if (!clean) return undefined;
  return DEFAULT_SEARCH_INTENTS.find(
    (i) => i.landingKind === "collection" && i.collectionSlug === clean,
  );
}

export function findIntentsForPath(path: string): SearchIntentTarget[] {
  const normalized = path.split("?")[0] || path;
  return DEFAULT_SEARCH_INTENTS.filter((i) => i.landingPath === normalized).sort(
    (a, b) => intentPriority(a) - intentPriority(b),
  );
}

/** Öncelikli tek hedef (landing meta / ItemList başlığı) */
export function findIntentForPath(path: string): SearchIntentTarget | undefined {
  return findIntentsForPath(path)[0];
}

const FAQ_MERGE_LIMIT = 12;

export function mergeFaqsForPath(path: string): SearchIntentFaq[] {
  const seen = new Set<string>();
  const merged: SearchIntentFaq[] = [];
  for (const intent of findIntentsForPath(path)) {
    for (const faq of intent.faqs) {
      const key = faq.question.trim().toLocaleLowerCase("tr-TR");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(faq);
      if (merged.length >= FAQ_MERGE_LIMIT) return merged;
    }
  }
  return merged;
}

/** Landing meta'nın hedef sorguyu ne kadar yansıttığını 0–1 arası döner */
export function queryCoverageInMeta(query: string, title: string, description: string): number {
  const meta = `${title} ${description}`.toLocaleLowerCase("tr-TR");
  const words = query
    .toLocaleLowerCase("tr-TR")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!words.length) return 0;
  const hits = words.filter((w) => meta.includes(w)).length;
  return hits / words.length;
}
