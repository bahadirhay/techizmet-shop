import type { SiteSettings } from "@/lib/site-settings";

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
const LANDING_KOPEK_ODUL_MAMASI = "/collections/kopek-odul-mamasi";
const LANDING_DOGAL_KOPEK_ODUL_MAMASI = "/collections/dogal-kopek-odul-mamasi";

/** anatolianpaw.com — organik + AI arama hedefleri */
export const DEFAULT_SEARCH_INTENTS: SearchIntentTarget[] = [
  {
    id: "dog-natural-treat",
    query: "doğal köpek ödülü",
    priority: 1,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
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
    id: "dog-treat-food",
    query: "köpek ödül maması",
    priority: 2,
    landingPath: LANDING_KOPEK_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "kopek-odul-mamasi",
    title: "Köpek Ödül Maması | Doğal ve Tahılsız | Anatolian Paw",
    description:
      "Köpek ödül maması çeşitleri — kurutulmuş organ etleri, çiğneme kemikleri ve eğitim ödülleri. Tahılsız, katkısız, Türkiye üretimi. Online sipariş, hızlı kargo ve güncel stok.",
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
          "Ana mama günlük beslenme ihtiyacını karşılar; ödül maması küçük porsiyonlarda verilir ve genelde daha yüksek protein, daha düşük tahıl içerir.",
      },
      {
        question: "Günde ne kadar köpek ödül maması verilmeli?",
        answer:
          "Veteriner önerisiyle günlük kalorinin en fazla %10'u ödül olarak verilebilir. Eğitim seanslarında küçük parçalar tercih edin.",
      },
      {
        question: "Hangi köpek ödül maması daha sağlıklı?",
        answer:
          "Tek proteinli, tahılsız ve katkısız kurutulmuş organ ödülleri (dana ciğer, akciğer gibi) içerik listesi kısa olan ürünler genelde daha sağlıklı kabul edilir.",
      },
    ],
  },
  {
    id: "natural-dog-treat-food",
    query: "doğal köpek ödül maması",
    priority: 2,
    landingPath: LANDING_DOGAL_KOPEK_ODUL_MAMASI,
    landingKind: "collection",
    collectionSlug: "dogal-kopek-odul-mamasi",
    title: "Doğal Köpek Ödül Maması | Tahılsız & Katkısız | Anatolian Paw",
    description:
      "Doğal köpek ödül maması — kurutulmuş dana ciğer, akciğer ve organ etlerinden tahılsız, katkısız ödüller. Tek protein kaynağı, Türkiye üretimi; eğitim ve günlük ödül için ideal. Hızlı kargo, güncel stok.",
    h1: "Doğal Köpek Ödül Maması",
    productKeywords: ["doğal", "köpek", "ödül", "mama", "kurutulmuş", "tahılsız", "ciğer", "akciğer"],
    suggestedBlogTitle: "Doğal Köpek Ödül Maması Rehberi: İçerik, Fayda ve Seçim",
    faqs: [
      {
        question: "Doğal köpek ödül maması nedir?",
        answer:
          "Doğal köpek ödül maması; yapay renklendirici, tahıl ve koruyucu içermeyen, tek protein kaynaklı (dana ciğer, akciğer gibi) kurutulmuş veya minimal işlem görmüş ödül ürünleridir. Eğitim ve pozitif pekiştirmede kullanılır.",
      },
      {
        question: "Doğal köpek ödül maması ile işlenmiş ödül arasındaki fark nedir?",
        answer:
          "Doğal ödüller kısa içerik listesine sahiptir ve katkı maddesi içermez; işlenmiş ödüllerde ise nişasta, şeker, renklendirici ve koruyucu bulunabilir. Doğal ödüller hassas sindirim için daha güvenli kabul edilir.",
      },
      {
        question: "Doğal köpek ödül maması fiyatları ne kadar?",
        answer:
          "Anatolian Paw doğal ödülleri genelde 150–250 TL aralığındadır. Protein türü, gramaj ve kurutma yöntemine göre değişir; güncel fiyatlar ürün sayfalarında listelenir.",
      },
      {
        question: "Hangi köpekler için uygundur?",
        answer:
          "Yetişkin ve uygun yaştaki yavru köpekler için kullanılabilir. Tek proteinli ve tahılsız olması, alerji ve hassasiyet riski düşük beslenme arayanlar için idealdir; özel diyette veterinere danışın.",
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
      "Köpek ödülü modelleri — dana ciğer, akciğer, kemik ve çiğneme stickleri. Eğitim ve davranış ödüllendirmesi için doğal, tahılsız seçenekler. Türkiye üretimi, hızlı teslimat.",
    h1: "Köpek Ödülü",
    productKeywords: ["köpek", "ödül", "ciğer", "akciğer", "kemik", "çiğneme", "doğal"],
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
      "Doğal köpek ödül maması fiyatları 2026 — kurutulmuş organ etleri, kemik ve çiğneme ödülleri. TRY fiyat, stok ve kargo bilgisiyle online sipariş.",
    h1: "Doğal Köpek Ödül Maması Fiyatları",
    productKeywords: ["fiyat", "doğal", "ödül", "köpek", "mama", "kurutulmuş"],
    suggestedBlogTitle: "Doğal Köpek Ödül Maması Fiyatları 2026 Karşılaştırması",
    faqs: [
      {
        question: "Doğal köpek ödül maması fiyatları neden değişir?",
        answer:
          "Protein türü (dana, kuzu), gramaj, kurutma yöntemi ve paket boyutuna göre fiyat değişir. Tek proteinli organ ödülleri genelde premium segmenttedir.",
      },
      {
        question: "2026'da doğal ödül maması ortalama fiyat aralığı nedir?",
        answer:
          "Anatolian Paw ürünlerinde çoğu doğal ödül 150–250 TL bandındadır; kampanya ve paket boyutuna göre güncel fiyat ürün sayfasında görünür.",
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
      "Köpek ödül maması fiyat listesi — ciğer, akciğer, kemik ve stick ödüller. Güncel TRY fiyat, stok durumu ve ücretsiz kargo eşiği bilgisiyle hemen sipariş verin.",
    h1: "Köpek Ödül Maması Fiyatları",
    productKeywords: ["köpek", "ödül", "mama", "fiyat", "ciğer", "akciğer"],
    faqs: [
      {
        question: "Köpek ödül maması fiyatları neye göre belirlenir?",
        answer:
          "Et türü, kurutma süreci, gramaj ve üretim maliyetine göre fiyat oluşur. Organ eti ödülleri genelde daha yüksek protein nedeniyle fiyatlıdır.",
      },
      {
        question: "En ucuz köpek ödül maması hangisi?",
        answer:
          "Küçük gramajlı stick veya mix paketler giriş seviyesi fiyat sunar; içerik listesini fiyata göre değil kaliteye göre değerlendirin.",
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
    query: "köpek eğitim ödülü",
    priority: 6,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Köpek Eğitim Ödülü | Küçük Parça, Yüksek Motivasyon | Anatolian Paw",
    description:
      "Köpek eğitim ödülü — küçük boy, yüksek koku ve hızlı tüketim için ideal kurutulmuş et parçaları. Otur, bekle, yanımda yürü komutları için doğal tahılsız seçenekler.",
    h1: "Köpek Eğitim Ödülü",
    productKeywords: ["eğitim", "köpek", "ödül", "ciğer", "doğal", "mama"],
    suggestedBlogTitle: "Köpek Eğitim Ödülü Nasıl Seçilir? Eğitmen Önerileri",
    faqs: [
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
    title: "Kurutulmuş Köpek Ödülü | Dana Ciğer ve Organ Etleri | Anatolian Paw",
    description:
      "Kurutulmuş köpek ödülü — düşük ısıda kurutulmuş dana ciğer, akciğer ve protein snackler. Uzun raf ömrü, yoğun lezzet, tahılsız içerik. Türkiye'de üretim, güvenilir kaynak.",
    h1: "Kurutulmuş Köpek Ödülü",
    productKeywords: ["kurutulmuş", "köpek", "ödül", "ciğer", "akciğer", "dana", "doğal"],
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
        question: "Kurutulmuş ciğer ödülü kimler için?",
        answer:
          "Yüksek protein isteyen aktif köpekler ve eğitim ödülü arayanlar için uygundur; böbrek hastalığı olan köpeklerde veterinere danışın.",
      },
    ],
  },
  {
    id: "beef-liver-dog-treat",
    query: "dana ciğer köpek ödülü",
    priority: 8,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Dana Ciğer Köpek Ödülü | Kurutulmuş, Tahılsız | Anatolian Paw",
    description:
      "Dana ciğer köpek ödülü — yüksek protein, demir ve B vitamini kaynağı kurutulmuş atıştırmalık. Eğitim ve ödüllendirme için küçük parçalara bölünebilir. Doğal içerik, hızlı kargo.",
    h1: "Dana Ciğer Köpek Ödülü",
    productKeywords: ["dana", "ciğer", "köpek", "ödül", "kurutulmuş", "doğal"],
    suggestedBlogTitle: "Dana Ciğer Köpek Ödülü: Besin Değeri ve Kullanım Önerileri",
    faqs: [
      {
        question: "Dana ciğer ödülü neden popüler?",
        answer:
          "Yoğun koku ve lezzet nedeniyle köpekler tarafından çok sevilir; eğitimde yüksek motivasyon sağlar.",
      },
      {
        question: "Dana ciğer ödülü her gün verilir mi?",
        answer:
          "Ödül olarak sınırlı miktarda verilmelidir; ana protein kaynağı mama olmalı, ciğer günlük ödül bandında kalmalıdır.",
      },
      {
        question: "Dana ciğer alerji yapar mı?",
        answer:
          "Sığır proteini hassasiyeti olan köpeklerde kaçınılmalıdır; yeni ödül tek tek ve küçük miktarda denenmelidir.",
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
      "Akciğer köpek ödülü — hafif yapılı, kolay çiğnenen kurutulmuş organ atıştırmalığı. Yavru ve yaşlı köpekler için uygun boyut seçenekleri. Tahılsız, katkısız Türkiye üretimi.",
    h1: "Akciğer Köpek Ödülü",
    productKeywords: ["akciğer", "köpek", "ödül", "kurutulmuş", "doğal", "yavru"],
    faqs: [
      {
        question: "Akciğer ödülü hangi köpekler için uygundur?",
        answer:
          "Hafif dokusu sayesinde küçük ırklar, yavrular ve yaşlı köpekler için sık tercih edilir; parça boyutuna dikkat edin.",
      },
      {
        question: "Akciğer ile ciğer ödülü farkı nedir?",
        answer:
          "Her ikisi de organ etidir; akciğer genelde daha hafif ve gevrek, ciğer daha yoğun protein ve koku sunar.",
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
    productKeywords: ["tahılsız", "köpek", "ödül", "doğal", "gluten", "ciğer", "kurutulmuş"],
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
    query: "köpek çiğneme kemiği",
    priority: 11,
    landingPath: LANDING_ALL,
    landingKind: "staticPage",
    staticPageKey: LANDING_ALL,
    title: "Köpek Çiğneme Kemiği | Doğal Kemik Ödülleri | Anatolian Paw",
    description:
      "Köpek çiğneme kemiği ve kemik ödül çeşitleri — diş temizliği ve uzun süreli meşguliyet için. Doğal kaynaklı, boyuta göre küçük ve orta ırk seçenekleri. Güvenli kullanım önerileriyle.",
    h1: "Köpek Çiğneme Kemiği",
    productKeywords: ["kemik", "çiğneme", "köpek", "ödül", "doğal", "stick"],
    suggestedBlogTitle: "Köpek Çiğneme Kemiği Seçimi: Güvenlik ve Irk Rehberi",
    faqs: [
      {
        question: "Köpek çiğneme kemiği ne işe yarar?",
        answer:
          "Diş yüzeyinde birikinti azaltmaya yardımcı olur, çiğneme içgüdüsünü tatmin eder ve sıkıntı anlarında meşgul eder.",
      },
      {
        question: "Yavru köpeğe kemik verilir mi?",
        answer:
          "Diş gelişimi tamamlanana kadar sert kemiklerden kaçının; yaşa uygun yumuşak çiğneme ürünleri tercih edin.",
      },
      {
        question: "Çiğneme kemiği ne kadar süre verilmeli?",
        answer:
          "Köpek kemiği parçalayıp yutmaya başladığında alın; gözetimsiz uzun süre bırakmayın.",
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
          "Temel komut öğrenimine başladığınızda, genelde 8–10 haftadan sonra küçük ödüllerle pozitif pekiştirme yapılabilir.",
      },
      {
        question: "Yavru için hangi ödül boyutu?",
        answer:
          "Noahut büyüklüğünde veya daha küçük parçalar idealdir; boğulma riskine karşı büyük parçalardan kaçının.",
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
    title: "Organ Köpek Ödülü | Ciğer, Akciğer, Böbrek | Anatolian Paw",
    description:
      "Organ köpek ödülü — ciğer, akciğer ve diğer tek protein organ atıştırmalıkları. Yüksek besin yoğunluğu, doğal kaynak, tahılsız formül. Eğitim ve çeşitlilik için ideal tamamlayıcı ödül.",
    h1: "Organ Köpek Ödülü",
    productKeywords: ["organ", "köpek", "ödül", "ciğer", "akciğer", "doğal", "kurutulmuş"],
    faqs: [
      {
        question: "Organ ödülü nedir?",
        answer:
          "Sığır veya kuzu ciğer, akciğer gibi sakatat kaynaklı, minimal işlem görmüş kurutulmuş köpek atıştırmalıklarıdır.",
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

export function getSearchIntents(_settings?: SiteSettings): SearchIntentTarget[] {
  return DEFAULT_SEARCH_INTENTS;
}

/** Adanmış landing sayfası olan (collection-kind) hedeflerin slug'larını döner */
export const LANDING_COLLECTION_SLUGS: string[] = DEFAULT_SEARCH_INTENTS.filter(
  (i) => i.landingKind === "collection" && Boolean(i.collectionSlug),
).map((i) => i.collectionSlug as string);

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
