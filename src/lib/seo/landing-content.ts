/**
 * Adanmış landing sayfalarının (/collections/<slug>) sayfaya özgü içeriği.
 *
 * Her sayfa kendi açısını, kendi ürün alt kümesini ve kendi seçim ölçütlerini taşır;
 * böylece aynı 9 ürünü aynı metinle tekrar eden dört sayfa yerine birbirinden ayrışan
 * sayfalar oluşur. Ürün alt kümesi slug listesiyle değil, ürün adından çıkarılan
 * hammaddelerle seçilir — yeni ürün eklendiğinde ilgili sayfaya kendiliğinden girer.
 *
 * Buradaki metinler yalnızca ürün sayfalarında zaten yazan bilgileri (saklama, %10 kuralı,
 * gözetim, su) ve genel geçer ifadeleri kullanır. Besin değeri yüzdesi ve yavru yaş sınırı
 * bilerek yazılmaz: ürün sayfalarındaki değerler ürünün kendi analizi değildir.
 */

export type LandingIngredientKey =
  | "dana-akciger"
  | "dana-girtlak"
  | "deve-derisi"
  | "kuzu-paca"
  | "tavuk-ayagi";

export type LandingAnimal = "Dana" | "Deve" | "Kuzu" | "Tavuk";

export type LandingIngredient = {
  key: LandingIngredientKey;
  /** Ürün adında aranır (tr-TR küçük harf) */
  match: string;
  label: string;
  animal: LandingAnimal;
  texture: string;
  use: "Eğitim" | "Çiğneme";
};

export const LANDING_INGREDIENTS: LandingIngredient[] = [
  {
    key: "dana-akciger",
    match: "akciğer",
    label: "Dana akciğer",
    animal: "Dana",
    texture: "Hafif, gevrek; elle bölünür",
    use: "Eğitim",
  },
  {
    key: "dana-girtlak",
    match: "gırtlak",
    label: "Dana gırtlak",
    animal: "Dana",
    texture: "Kıkırdaklı, sert",
    use: "Çiğneme",
  },
  {
    key: "deve-derisi",
    match: "deve derisi",
    label: "Deve derisi",
    animal: "Deve",
    texture: "Sert; uzun süre çiğnenir",
    use: "Çiğneme",
  },
  {
    key: "kuzu-paca",
    match: "paça",
    label: "Kuzu paça",
    animal: "Kuzu",
    texture: "Sert; bütün parça",
    use: "Çiğneme",
  },
  {
    key: "tavuk-ayagi",
    match: "tavuk ayağı",
    label: "Tavuk ayağı",
    animal: "Tavuk",
    texture: "Çıtır; bütün parça",
    use: "Çiğneme",
  },
];

/** Ürün adından hammaddeleri çıkarır (adında geçtiği sırayla) */
export function detectLandingIngredients(title: string): LandingIngredient[] {
  const hay = title.toLocaleLowerCase("tr-TR");
  return LANDING_INGREDIENTS.map((ing) => ({ ing, at: hay.indexOf(ing.match) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.ing);
}

export type LandingCriterion = { title: string; text: string };

export type LandingGroupDef = {
  title: string;
  text: string;
  filter: (ingredients: LandingIngredient[]) => boolean;
  link?: { label: string; href: string };
};

/** Hub’daki görsel karar kartları — tıklanınca alt landing */
export type LandingPathDef = {
  label: string;
  href: string;
  text: string;
  /** Kart görseli için ürün hammaddesi */
  imageIngredientKey?: LandingIngredientKey;
};

export type LandingContentDef = {
  intro: string[];
  /**
   * Hero tek cümle. Tanımlıysa sayfa marketplace ızgarası yerine
   * marka hero + (opsiyonel) karar şeridi ile açılır.
   */
  heroLead?: string;
  paths?: LandingPathDef[];
  /** Sayfada gösterilecek ürünler; yoksa tüm vitrin ürünleri */
  filter?: (ingredients: LandingIngredient[]) => boolean;
  tableHeading: string;
  criteriaHeading: string;
  criteria: LandingCriterion[];
  /** Ürünleri alt başlıklara böler (hub ve kaynağa göre sayfalar) */
  groups?: LandingGroupDef[];
  /** İlgili rehber yazıları (yayında olanlar listelenir) */
  blogSlugs: string[];
  /** İlgili landing sayfaları (collection slug) */
  related: string[];
};

const hasIngredient = (ings: LandingIngredient[], key: LandingIngredientKey) =>
  ings.some((i) => i.key === key);

const isTraining = (ings: LandingIngredient[]) => hasIngredient(ings, "dana-akciger");
const isChew = (ings: LandingIngredient[]) => ings.length > 0 && !hasIngredient(ings, "dana-akciger");
const isSingle = (ings: LandingIngredient[]) => ings.length === 1;
const singleOf = (animal: LandingAnimal) => (ings: LandingIngredient[]) =>
  ings.length === 1 && ings[0].animal === animal;

const RULE_DAILY: LandingCriterion = {
  title: "Günlük miktar",
  text: "Ödüller köpeğinizin günlük kalorisinin %10'unu geçmemelidir; ödül verdiğiniz gün ana mamayı buna göre azaltın.",
};
const RULE_WATER: LandingCriterion = {
  title: "Su",
  text: "Kurutulmuş ürünlerin yanında her zaman temiz içme suyu bulundurun.",
};
const RULE_STORAGE: LandingCriterion = {
  title: "Saklama",
  text: "Serin, kuru ve doğrudan güneş almayan bir yerde saklayın. Paket açıldıktan sonra ağzını kapatın ve 30 gün içinde tüketin.",
};
const RULE_PUPPY: LandingCriterion = {
  title: "Yavru köpekler",
  text: "Yavru köpeklere vermeden önce veterinerinize danışın.",
};
const RULE_SUPERVISE: LandingCriterion = {
  title: "Gözetim",
  text: "Köpeğiniz çiğnerken yanında bulunun; yutabileceği kadar küçülen parçayı alın.",
};

export const LANDING_CONTENT: Record<string, LandingContentDef> = {
  "kopek-odul-mamasi": {
    heroLead:
      "Kurutulmuş, tahılsız ve katkısız köpek ödül mamaları — eğitimde küçük parçalar, çiğnemede sert ürünler.",
    intro: [
      "Tüm Anatolian Paw ürünleri bu sayfada: dana akciğer, dana gırtlak, deve derisi, kuzu paça, tavuk ayağı ve karışık paketler. Amaç veya hammaddene göre aşağıdaki yollardan da gidebilirsiniz.",
    ],
    paths: [
      {
        label: "Eğitim ödülü",
        href: "/collections/kopek-egitim-odul-mamasi",
        text: "Elle bölünen, bir lokmada yenen dana akciğer.",
        imageIngredientKey: "dana-akciger",
      },
      {
        label: "Çiğneme",
        href: "/collections/kopek-cigneme-urunleri",
        text: "Deve derisi, gırtlak, paça ve tavuk ayağı.",
        imageIngredientKey: "deve-derisi",
      },
      {
        label: "Tek protein",
        href: "/collections/dogal-kopek-odul-mamasi",
        text: "İçerik listesi tek satır; tahıl ve katkı yok.",
        imageIngredientKey: "dana-girtlak",
      },
    ],
    tableHeading: "Köpek ödül maması karşılaştırma tablosu",
    criteriaHeading: "Köpek ödül maması nasıl seçilir?",
    criteria: [
      {
        title: "Kullanım amacı",
        text: "Eğitimde bir lokmada yenen küçük parçalar, çiğneme ihtiyacında uzun süre dayanan sert ürünler işe yarar.",
      },
      {
        title: "İçerik listesi",
        text: "Tek ya da iki hammaddeli, tahıl ve katkı içermeyen ürünlerde köpeğinizin ne yediğini bilirsiniz.",
      },
      {
        title: "Paket boyutu",
        text: "İlk denemede küçük paket yeterlidir. Tablodaki 100 g fiyatı sütunu farklı gramajları karşılaştırmayı kolaylaştırır.",
      },
      RULE_DAILY,
      RULE_STORAGE,
    ],
    blogSlugs: ["kopek-odul-mamasi-nasil-secilir", "kopek-odul-mamasi-gunluk-kalori", "kopek-odul-mamasi"],
    related: [
      "kopek-egitim-odul-mamasi",
      "kopek-cigneme-urunleri",
      "dana-akciger-kopek-odulu",
      "deve-derisi-kopek-odulu",
      "dana-girtlak-kopek-odulu",
      "dogal-kopek-odul-mamasi",
      "odul-mamasi",
    ],
  },

  "dogal-kopek-odul-mamasi": {
    intro: [
      "Doğal köpek ödül maması, içerik listesinde tek bir hammadde bulunan; tahıl, renklendirici ve koruyucu eklenmemiş ödüldür. Bu sayfada yalnızca tek hammaddeli Anatolian Paw ürünleri yer alır: kurutulmuş dana akciğer, dana gırtlak, deve derisi, kuzu paça ve tavuk ayağı.",
      "Tek hammaddeli ödülün pratik faydası şudur: köpeğiniz bir ürüne iyi tepki vermezse bunun hangi içerikten kaynaklandığını bilirsiniz. Yeni bir ödülü küçük miktarla deneyin ve birkaç gün gözlemleyin.",
    ],
    filter: isSingle,
    tableHeading: "Tek hammaddeli doğal ödül mamaları",
    criteriaHeading: "Bir ödül mamasının doğal olduğu nasıl anlaşılır?",
    criteria: [
      {
        title: "İçerik listesi tek satır",
        text: "Etikette yalnızca hammaddenin adı yazar; un, nişasta, şeker ya da aroma bulunmaz.",
      },
      {
        title: "Hammadde adı açık",
        text: "“Et ve et ürünleri” gibi genel ifadeler yerine dana akciğer, deve derisi gibi belirli bir hammadde yazar.",
      },
      {
        title: "Görünüm",
        text: "Kurutulmuş doğal ürünlerde renk ve parça boyutu paketten pakete değişebilir.",
      },
      {
        title: "Saklama süresi",
        text: "Koruyucu içermediği için açıldıktan sonra ağzı kapalı, serin ve kuru yerde saklanır ve 30 gün içinde tüketilir.",
      },
      RULE_DAILY,
    ],
    blogSlugs: ["dogal-kopek-odulu-nedir", "alerjik-kopek-odul-mamasi", "kopek-odul-mamasi-nasil-secilir"],
    related: ["kopek-odul-mamasi", "dogal-kopek-odulu", "kopek-egitim-odul-mamasi", "kopek-cigneme-urunleri"],
  },

  "odul-mamasi": {
    intro: [
      "Ödül maması, köpeğe ana öğünün dışında verilen küçük miktardaki yiyecektir. Bu mağazadaki ödül mamalarının tamamı köpekler içindir ve iki amaca göre ayrılır: eğitimde hızlı yenen küçük parçalar ile uzun süre çiğnenen ürünler.",
      "Hangi türe ihtiyacınız olduğunu aşağıdaki iki gruptan seçebilirsiniz. Her grubun kendi sayfasında ürünlerin karşılaştırması ve kullanım önerileri bulunur.",
    ],
    tableHeading: "Ödül maması türleri karşılaştırması",
    criteriaHeading: "Ödül maması verirken nelere dikkat edilir?",
    criteria: [
      RULE_DAILY,
      RULE_SUPERVISE,
      RULE_WATER,
      {
        title: "Yeni ürün",
        text: "İlk kez verdiğiniz ödülü küçük miktarla deneyin ve köpeğinizin sindirimini gözlemleyin.",
      },
      RULE_PUPPY,
    ],
    groups: [
      {
        title: "Eğitim için ödül mamaları",
        text: "Kurutulmuş dana akciğer hafif ve gevrektir; elle küçük parçalara ayrılır ve eğitim sırasında hızlı yenir.",
        filter: isTraining,
        link: { label: "Köpek eğitim ödül mamaları", href: "/collections/kopek-egitim-odul-mamasi" },
      },
      {
        title: "Çiğneme için ödül mamaları",
        text: "Deve derisi, dana gırtlak, kuzu paça ve tavuk ayağı daha sert ürünlerdir; köpeği bir süre meşgul eder.",
        filter: isChew,
        link: { label: "Köpek çiğneme ürünleri", href: "/collections/kopek-cigneme-urunleri" },
      },
    ],
    blogSlugs: ["kopek-odul-mamasi", "yavru-kopeklere-odul-mamasi", "kopek-odul-mamasi-gunluk-kalori"],
    related: [
      "kopek-egitim-odul-mamasi",
      "kopek-cigneme-urunleri",
      "kopek-odul-mamasi",
      "dogal-kopek-odul-mamasi",
    ],
  },

  "dogal-kopek-odulu": {
    intro: [
      "Doğal köpek ödülü seçerken ilk bakılacak şey protein kaynağıdır. Anatolian Paw ödülleri dört hayvansal kaynaktan gelir: dana (akciğer ve gırtlak), deve (deri), kuzu (paça) ve tavuk (ayak). Hepsi kurutulmuştur; tahıl, renklendirici ve koruyucu içermez.",
      "Köpeğinizin bir proteine hassasiyeti varsa ya da çeşit yapmak istiyorsanız aşağıdaki gruplardan kaynağa göre seçim yapabilirsiniz.",
    ],
    tableHeading: "Protein kaynağına göre doğal köpek ödülleri",
    criteriaHeading: "Kurutulmuş doğal ödül nasıl kullanılır ve saklanır?",
    criteria: [RULE_STORAGE, RULE_WATER, RULE_SUPERVISE, RULE_DAILY, RULE_PUPPY],
    groups: [
      {
        title: "Dana ödülleri",
        text: "Dana akciğer hafif ve gevrek, dana gırtlak kıkırdaklı ve daha serttir.",
        filter: singleOf("Dana"),
      },
      {
        title: "Deve ödülleri",
        text: "Deve derisi sert bir üründür ve uzun süre çiğnenir.",
        filter: singleOf("Deve"),
      },
      {
        title: "Kuzu ödülleri",
        text: "Kuzu paça bütün parça olarak kurutulur ve adetle satılır.",
        filter: singleOf("Kuzu"),
      },
      {
        title: "Tavuk ödülleri",
        text: "Tavuk ayağı bütün parça olarak kurutulur.",
        filter: singleOf("Tavuk"),
      },
      {
        title: "Karışık paketler",
        text: "İki hammaddenin aynı pakette bulunduğu ürünler.",
        filter: (ings) => ings.length > 1,
      },
    ],
    blogSlugs: ["dogal-kopek-odulu-nedir", "kurutulmus-deve-derisi-kopek-odulu", "alerjik-kopek-odul-mamasi"],
    related: ["dogal-kopek-odul-mamasi", "kopek-odul-mamasi", "kopek-cigneme-urunleri", "kopek-egitim-odul-mamasi"],
  },

  "kopek-egitim-odul-mamasi": {
    intro: [
      "Eğitim ödül maması, köpeğin bir lokmada yiyip dikkatini yeniden size verebileceği kadar küçük olmalıdır. Kurutulmuş dana akciğer bu iş için uygundur: hafif ve gevrektir, elle istediğiniz boyutta parçalara ayrılır.",
      "Bu sayfada akciğer içeren Anatolian Paw ürünleri yer alır: tek başına kurutulmuş dana akciğerin küçük ve büyük paketi ile akciğerli karışık paketler.",
    ],
    filter: isTraining,
    tableHeading: "Eğitim ödül mamaları karşılaştırması",
    criteriaHeading: "Eğitim ödül maması nasıl kullanılır?",
    criteria: [
      {
        title: "Parça boyutu",
        text: "Nohut büyüklüğünde ya da daha küçük parçalar yeterlidir; küçük ırklarda daha da küçültün.",
      },
      {
        title: "Zamanlama",
        text: "Ödülü istediğiniz davranışın hemen ardından verin.",
      },
      {
        title: "Hazırlık",
        text: "Ödülleri seans başlamadan önce bölüp hazırlayın; kuru olduğu için ödül çantasında taşınabilir.",
      },
      {
        title: "Günlük miktar",
        text: "Ödüller günlük kalorinin %10'unu geçmemelidir; eğitimin yoğun olduğu günlerde ana mamayı buna göre azaltın.",
      },
      RULE_WATER,
    ],
    groups: [
      {
        title: "Kurutulmuş dana akciğer",
        text: "Tek hammaddeli akciğer paketleri; elle bölünür, eğitimde hızlı yenir. İlk deneme için küçük paket, yoğun eğitim için büyük paket uygundur.",
        filter: (ings) => ings.length === 1 && hasIngredient(ings, "dana-akciger"),
      },
      {
        title: "Akciğerli karışık paketler",
        text: "Dana akciğer ile ikinci bir hammaddenin aynı pakette bulunduğu seçenekler; eğitim parçası yanında çiğneme çeşitliliği isterken kullanılır.",
        filter: (ings) => ings.length > 1 && hasIngredient(ings, "dana-akciger"),
        link: { label: "Çiğneme ürünlerine bak", href: "/collections/kopek-cigneme-urunleri" },
      },
    ],
    blogSlugs: ["kopek-egitimi-odul-zamanlama", "kopek-tuvalet-egitimi-odul", "yavru-kopeklere-odul-mamasi"],
    related: [
      "dana-akciger-kopek-odulu",
      "kopek-cigneme-urunleri",
      "kopek-odul-mamasi",
      "odul-mamasi",
    ],
  },

  "kopek-cigneme-urunleri": {
    intro: [
      "Köpek çiğneme ürünleri, çiğneme içgüdüsünü karşılayan ve köpeği bir süre meşgul eden sert ödüllerdir. Anatolian Paw'da çiğneme kemiği yerine kurutulmuş doğal ürünler bulunur: deve derisi, dana gırtlak, kuzu paça ve tavuk ayağı.",
      "Hangisini seçeceğiniz köpeğinizin boyuna ve ne kadar güçlü çiğnediğine bağlıdır. Tabloda ürünlerin dokusunu, paket boyutunu ve fiyatını karşılaştırabilirsiniz.",
    ],
    filter: isChew,
    tableHeading: "Çiğneme ürünleri karşılaştırması",
    criteriaHeading: "Çiğneme ürünü güvenle nasıl verilir?",
    criteria: [
      RULE_SUPERVISE,
      {
        title: "Boyut",
        text: "Köpeğinizin bütün olarak yutabileceği kadar küçük bir parçayı vermeyin.",
      },
      RULE_WATER,
      RULE_DAILY,
      RULE_PUPPY,
    ],
    groups: [
      {
        title: "Deve derisi",
        text: "Sert dokulu; uzun süre çiğnenir. Güçlü çiğneyen yetişkin köpekler için uygundur.",
        filter: singleOf("Deve"),
        link: { label: "Deve derisi köpek ödülü", href: "/collections/deve-derisi-kopek-odulu" },
      },
      {
        title: "Dana gırtlak",
        text: "Kıkırdaklı ve daha sert; çiğneme ihtiyacını karşılar.",
        filter: singleOf("Dana"),
        link: { label: "Dana gırtlak köpek ödülü", href: "/collections/dana-girtlak-kopek-odulu" },
      },
      {
        title: "Kuzu paça",
        text: "Bütün parça olarak kurutulur; adetle satılır.",
        filter: singleOf("Kuzu"),
      },
      {
        title: "Tavuk ayağı",
        text: "Çıtır dokulu bütün parça; küçük ve orta boy köpeklerde sık tercih edilir.",
        filter: singleOf("Tavuk"),
      },
      {
        title: "Karışık çiğneme paketleri",
        text: "İki çiğneme hammaddesinin aynı pakette bulunduğu seçenekler.",
        filter: (ings) => ings.length > 1,
      },
    ],
    blogSlugs: ["kopek-dis-sagligi-kemik", "kurutulmus-deve-derisi-kopek-odulu"],
    related: [
      "deve-derisi-kopek-odulu",
      "dana-girtlak-kopek-odulu",
      "kopek-egitim-odul-mamasi",
      "kopek-odul-mamasi",
      "dogal-kopek-odulu",
    ],
  },

  "dana-akciger-kopek-odulu": {
    heroLead:
      "Hafif ve gevrek kurutulmuş dana akciğer — elle küçük parçalara bölünür; eğitim ve günlük ödül için.",
    intro: [
      "Bu sayfada dana akciğer içeren Anatolian Paw ürünleri vardır: tek hammaddeli paketler ve akciğerli karışımlar. Tahıl, renklendirici ve koruyucu eklenmez.",
    ],
    filter: (ings) => hasIngredient(ings, "dana-akciger"),
    tableHeading: "Dana akciğer köpek ödülü karşılaştırması",
    criteriaHeading: "Dana akciğer ödülü nasıl kullanılır?",
    criteria: [
      {
        title: "Parça boyutu",
        text: "Eğitimde nohut büyüklüğünde veya daha küçük parçalar yeterlidir.",
      },
      {
        title: "İlk paket",
        text: "Köpeğiniz ilk kez deniyorsa küçük gramajla başlayın.",
      },
      RULE_DAILY,
      RULE_WATER,
      RULE_STORAGE,
    ],
    blogSlugs: ["kopek-egitimi-odul-zamanlama", "kopek-odul-mamasi-nasil-secilir"],
    related: [
      "kopek-egitim-odul-mamasi",
      "kopek-odul-mamasi",
      "dogal-kopek-odul-mamasi",
      "deve-derisi-kopek-odulu",
      "dana-girtlak-kopek-odulu",
    ],
  },

  "deve-derisi-kopek-odulu": {
    heroLead:
      "Kurutulmuş deve derisi — sert dokulu, uzun süre çiğnenen doğal köpek ödülü; tek hammadde, katkısız.",
    intro: [
      "Deve derisi içeren Anatolian Paw ürünleri bu sayfada toplanır. Güçlü çiğneyen yetişkin köpekler için uygundur; çiğnerken yanında bulunun.",
    ],
    filter: (ings) => hasIngredient(ings, "deve-derisi"),
    tableHeading: "Deve derisi köpek ödülü karşılaştırması",
    criteriaHeading: "Deve derisi ödülü güvenle nasıl verilir?",
    criteria: [
      RULE_SUPERVISE,
      {
        title: "Boyut",
        text: "Köpeğinizin bütün olarak yutabileceği kadar küçülen parçayı alın.",
      },
      RULE_WATER,
      RULE_DAILY,
      RULE_PUPPY,
    ],
    blogSlugs: ["kurutulmus-deve-derisi-kopek-odulu", "kopek-dis-sagligi-kemik"],
    related: [
      "kopek-cigneme-urunleri",
      "dana-girtlak-kopek-odulu",
      "kopek-odul-mamasi",
      "dogal-kopek-odul-mamasi",
    ],
  },

  "dana-girtlak-kopek-odulu": {
    heroLead:
      "Kurutulmuş dana gırtlak — kıkırdaklı, sert dokulu çiğneme ödülü; tek hammaddeli ve tahılsız.",
    intro: [
      "Dana gırtlak içeren ürünler bu sayfada. Çiğneme ihtiyacını karşılayan kıkırdaklı doku; tahıl ve katkı içermez.",
    ],
    filter: (ings) => hasIngredient(ings, "dana-girtlak"),
    tableHeading: "Dana gırtlak köpek ödülü karşılaştırması",
    criteriaHeading: "Dana gırtlak ödülü nasıl verilir?",
    criteria: [
      RULE_SUPERVISE,
      RULE_WATER,
      RULE_DAILY,
      RULE_STORAGE,
      RULE_PUPPY,
    ],
    blogSlugs: ["kopek-dis-sagligi-kemik", "kopek-odul-mamasi-nasil-secilir"],
    related: [
      "kopek-cigneme-urunleri",
      "deve-derisi-kopek-odulu",
      "dana-akciger-kopek-odulu",
      "kopek-odul-mamasi",
    ],
  },
};

export function findLandingContent(slug: string): LandingContentDef | undefined {
  return LANDING_CONTENT[slug.trim().toLowerCase()];
}
