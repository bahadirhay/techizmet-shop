import type { ShopLocale } from "@/lib/i18n/locale";
import { MIRROR_COLLECTION_SORT_TR_PAIRS } from "@/lib/mirror-collection-sort-locale";
import { applyMirrorEnHtml } from "@/lib/mirror-en-locale";
import { MIRROR_TR_CATALOG } from "@/lib/mirror-tr-catalog";

/** Techizmet Shop mirror *-tr.html — gömülü İngilizce UI metinleri */
const MIRROR_TR_PAIRS_BASE: ReadonlyArray<readonly [string, string]> = [
  ...MIRROR_COLLECTION_SORT_TR_PAIRS,
  // Uzun paragraflar (önce)
  [
    "Enhance Your Natural Beauty is more than just a tagline — it's a philosophy that embraces who you are. It encourages confidence in your skin, celebrating every feature without the need for heavy coverage or drastic change. <br />\n<br />\nInstead of masking imperfections, it focuses on nurturing and highlighting your unique glow with gentle, effective skincare.",
    "Doğal güzelliğinizi öne çıkarmak yalnızca bir slogan değil — kim olduğunuzu kucaklayan bir felsefedir. Cildinize güven duymanızı teşvik eder; ağır kapatıcı veya köklü değişim olmadan her özelliğinizi kutlar. <br />\n<br />\nKusurları gizlemek yerine, nazik ve etkili cilt bakımıyla benzersiz ışıltınızı beslemeye ve öne çıkarmaya odaklanır.",
  ],
  [
    "Enhance Your Natural Beauty is more than just a tagline - it's a philosophy that embraces who you are. It encourages confidence in your skin, celebrating every feature without the need for heavy coverage or drastic change. <br />\n<br />\nInstead of masking imperfections, it focuses on nurturing and highlighting your unique glow with gentle, effective skincare.",
    "Doğal güzelliğinizi öne çıkarmak yalnızca bir slogan değil — kim olduğunuzu kucaklayan bir felsefedir. Cildinize güven duymanızı teşvik eder; ağır kapatıcı veya köklü değişim olmadan her özelliğinizi kutlar. <br />\n<br />\nKusurları gizlemek yerine, nazik ve etkili cilt bakımıyla benzersiz ışıltınızı beslemeye ve öne çıkarmaya odaklanır.",
  ],
  [
    "Stay ahead in your skincare journey with the latest expert-backed tips and trends. From daily routines to seasonal adjustments, we share everything you need to know to keep your skin healthy, glowing, and radiant.",
    "Cilt bakımı yolculuğunuzda uzman destekli en güncel ipuçları ve trendlerle öne çıkın. Günlük rutinlerden mevsimsel ayarlamalara kadar cildinizi sağlıklı, ışıltılı ve canlı tutmak için bilmeniz gereken her şeyi paylaşıyoruz.",
  ],
  [
    "Skincare has taken a refreshing turn toward natural, clean, and plant-based ingredients. People are becoming more aware of what they...",
    "Cilt bakımı doğal, temiz ve bitki bazlı içeriklere yöneliyor. İnsanlar ciltlerine sürdükleri ürünlerin ne olduğunun daha fazla farkında...",
  ],
  [
    "Creating the perfect skincare routine starts with one important step: Understanding your skin. What works for someone with dry skin...",
    "Mükemmel cilt bakımı rutini oluşturmak önemli bir adımla başlar: Cildinizi anlamak. Kuru cilt için işe yarayan bir ürün...",
  ],
  [
    "Latest Skincare Tips <span class=\"markers-text accent-font no-markers\">You Should Know</span>",
    "Son Cilt Bakımı İpuçları <span class=\"markers-text accent-font no-markers\">Bilmeniz Gerekenler</span>",
  ],
  ["Latest Skincare Tips ", "Son Cilt Bakımı İpuçları "],
  ["You Should Know", "Bilmeniz Gerekenler"],
  ["Top Natural Ingredients for Glowing Skin", "Parlayan Cilt İçin En İyi Doğal İçerikler"],
  ["Build the Perfect Skincare Routine", "Mükemmel Cilt Bakımı Rutini Oluşturun"],
  ["Image of Top Natural Ingredients for Glowing Skin", "Parlayan Cilt İçin Doğal İçerikler Görseli"],
  ["Image of Build the Perfect Skincare Routine", "Mükemmel Cilt Bakımı Rutini Görseli"],
  ["EXPLORE ALL", "TÜMÜNÜ KEŞFET"],
  ["İletişim Us", "İletişim"],
  [
    "A celebration of clean, skin-loving formulas crafted from pure, plant-based ingredients for naturally radiant results.",
    "Temiz, cilde sevgi dolu formüller — saf, bitki bazlı içeriklerle doğal ışıltı için.",
  ],
  [
    "Discover the essence of natural radiance with our clean, skin-loving formulations designed to nourish, protect, and enhance your natural glow. At the heart of our collection is a commitment to purity — free from harsh chemicals, parabens, and artificial fragrances. Whether you're refreshing your skincare routine or searching for gentle, effective products, Pure Beauty delivers results you can see and feel. Embrace your skin’s true potential and let your beauty shine from the inside out.",
    "Doğal ışıltının özünü keşfedin: cildinizi besleyen, koruyan ve doğal parlaklığınızı artıran temiz formüller. Koleksiyonumuzun kalbinde saflık taahhüdü vardır — sert kimyasallar, paraben ve yapay kokulardan arındırılmıştır. Cilt bakım rutininizi yenilerken veya nazik, etkili ürünler ararken Pure Beauty, görebileceğiniz ve hissedebileceğiniz sonuçlar sunar.",
  ],
  [
    "Where beauty rituals transform into moments of self-love. Our collection is thoughtfully designed to not only enhance your skin but also nurture your well-being. Because true beauty begins the moment you prioritize yourself — this is where skincare meets self-care.<br/><br/></p><p>Discover a skincare experience that goes beyond surface beauty. At the heart of our collection lies a commitment to self-care — each product is crafted to nourish your skin while offering a moment of calm in your day. Whether it’s a hydrating mist before work, a soothing cleanser at night, or a rich moisturizer during your wind-down ritual, our formulas are designed to help you reconnect with yourself.</p>",
    "Güzellik ritüelleri kendinize sevgi anlarına dönüşür. Koleksiyonumuz yalnızca cildinizi değil, iyi oluşunuzu da desteklemek için tasarlandı. Gerçek güzellik, kendinize öncelik verdiğiniz anda başlar — cilt bakımı burada öz bakım ile buluşur.<br/><br/></p><p>Yüzeysel güzelliğin ötesine geçen bir cilt bakımı deneyimi keşfedin. Her ürün cildinizi beslerken gününüze sakinlik katar.</p>",
  ],
  [
    "At the core of our philosophy lies a simple yet powerful belief — beauty should feel as good as it looks. Our products are thoughtfully formulated using nature’s finest ingredients to enhance your natural radiance without compromise. We empower you to care for your skin with confidence, knowing you're using gentle, effective, and earth-conscious solutions.</p><br><p>Every formula is a blend of purity and performance, designed to celebrate your unique glow while supporting a cleaner, more mindful approach to beauty. Because when you nourish your skin naturally, you empower your true beauty to shine through — effortlessly and authentically.</p>",
    "Felsefemizin özünde güçlü bir inanç yatar — güzellik göründüğü kadar iyi hissettirmelidir. Ürünlerimiz doğanın en iyi içerikleriyle formüle edilmiştir. Her formül saflık ve performansı bir araya getirir; benzersiz ışıltınızı kutlar.</p><br><p>Cildinizi doğal yollarla beslediğinizde, gerçek güzelliğiniz zahmetsizce parlar.</p>",
  ],
  [
    "Indulge in the Natural Skincare Collection designed to deliver spa like results at home daily",
    "Evde her gün spa benzeri sonuçlar sunan doğal cilt bakımı koleksiyonunun keyfini çıkarın",
  ],
  [
    "There was an error while updating your cart. Please try again.",
    "Sepetiniz güncellenirken bir hata oluştu. Lütfen tekrar deneyin.",
  ],
  [
    "You can only add [quantity] of this item to your cart.",
    "Bu üründen sepetinize en fazla [quantity] adet ekleyebilirsiniz.",
  ],
  [
    "Gift card recipient form expanded",
    "Hediye kartı alıcı formu genişletildi",
  ],
  [
    "Gift card recipient form collapsed",
    "Hediye kartı alıcı formu daraltıldı",
  ],
  [
    "[count] countries/regions found",
    "[count] ülke/bölge bulundu",
  ],
  [
    "Image [index] is now available in gallery view",
    "Görsel [index] galeri görünümünde",
  ],
  [
    "Link copied to clipboard",
    "Bağlantı panoya kopyalandı",
  ],
  ["Select your country and language", "Ülke ve dilinizi seçin"],
  ["Help & Support", "Yardım & Destek"],
  ["Quick Links", "Hızlı Linkler"],
  ["Top Selling", "Çok Satanlar"],
  ["Privacy Policy", "Gizlilik Politikası"],
  ["Terms of Use", "Kullanım Şartları"],
  ["Return Policy", "İade Politikası"],
  ["Privacy policy", "Gizlilik politikası"],
  ["Terms of service", "Hizmet şartları"],
  ["Refund policy", "İade politikası"],
  ["Best Sellers", "Çok Satanlar"],
  ["Anti-Cellulite Body Oil", "Anti-Selülit Vücut Yağı"],
  ["Berry Tint Lip Balm", "Berry Dudak Balmı"],
  ["Face Moisturizer", "Yüz Nemlendirici"],
  ["Ultra-Fine Mist", "Ultra İnce Mist"],
  ["Makeup Fixer", "Makyaj Sabitleyici"],
  ["View detailsfor ", "Ürün detayı: "],
  ["Share on Facebook", "Facebook'ta paylaş"],
  ["Tweet on Twitter", "Twitter'da paylaş"],
  ["Pin on Pinterest", "Pinterest'te paylaş"],
  ["Share on Telegram", "Telegram'da paylaş"],
  ["Share on Email", "E-posta ile paylaş"],
  ["Shop Your Favorites for Less!", "Favorilerinizi daha ucuza alın!"],
  ["Add to Cart Now & Save Big!", "Hemen sepete ekleyin, büyük tasarruf!"],
  ["Create an account", "Hesap oluştur"],
  ["Suggested searches", "Önerilen aramalar"],
  ["Suggestions", "Öneriler"],
  ["Search products", "Ürün ara"],
  ['aria-label="Search"', 'aria-label="Arama"'],
  ['title="Search"', 'title="Arama"'],
  ["Popular collections", "Popüler koleksiyonlar"],
  ["Reset password", "Şifre sıfırla"],
  ["Forgot password??", "Şifremi unuttum?"],
  ["Your cart is empty", "Sepetiniz boş"],
  ["Availability", "Stok durumu"],
  ["Collection", "Koleksiyonu"],
  ["Unavailable", "Mevcut değil"],
  ["Preorder", "Ön sipariş"],
  ["Collections", "Koleksiyonlar"],
  ["Add address", "Adres ekle"],
  ["Add to cart", "Sepete ekle"],
  ["Sold out", "Tükendi"],
  ["View cart", "Sepeti gör"],
  ["Quantity", "Miktar"],
  ["Shades", "Tonlar"],
  ["Volume", "Hacim"],
  ["Brand", "Marka"],
  ["Price", "Fiyat"],
  [" View details", " Detayları gör"],
  ["View details", "Detayları gör"],
  ["In stock", "Stokta"],
  ["In stock, ready to be shipped", "Stokta, kargoya hazır"],
  ["Stokta, ready to be shipped", "Stokta, kargoya hazır"],
  ["ready to be shipped", "kargoya hazır"],
  ["Out of stock", "Stokta yok"],
  ["Clear all", "Tümünü temizle"],
  ["Show filters", "Filtreleri göster"],
  ["Hide filters", "Filtreleri gizle"],
  ["Filter", "Filtre"],
  ["Contact", "İletişim"],
  ["About", "Hakkımızda"],
  ["Home", "Ana Sayfa"],
  ["News", "Haberler"],
  ["Login", "Giriş"],
  ["Log in", "Giriş yap"],
  ["Account", "Hesap"],
  ["Go to top", "Yukarı çık"],
  ['title="Go to top"', 'title="Yukarı çık"'],
  ["Store locator", "Mağaza bulucu"],
  ["Create account", "Hesap oluştur"],
  ["First name", "Ad"],
  ["Last name", "Soyad"],
  ["Enter your password", "Şifrenizi girin"],
  ["Email address", "E-posta adresiniz"],
  ["Already have an account?", "Zaten üye misiniz?"],
  ["Log in here", "Giriş yapın"],
  ["Don't have any account?", "Hesabınız yok mu?"],
  ["Forgot password??", "Şifremi unuttum?"],
  ['return (m && m[1]) || "en";', 'return (m && m[1]) || "tr";'],
  ['lang="en"', 'lang="tr"'],
  ['"locale":"en"', '"locale":"tr"'],
];

const MIRROR_TR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ...MIRROR_TR_CATALOG,
  ...MIRROR_TR_PAIRS_BASE,
];

let sortedPairs: Array<readonly [string, string]> | null = null;

function getSortedPairs(): Array<readonly [string, string]> {
  if (!sortedPairs) {
    sortedPairs = [...MIRROR_TR_PAIRS].sort((a, b) => b[0].length - a[0].length);
  }
  return sortedPairs;
}

const URL_ATTR_NAMES =
  "src|href|srcset|data-src|data-original|data-srcset|poster|content|action";

/** Dosya yolu, upload veya JS API adı — çeviri asla dokunmasın */
const PRESERVE_ANYWHERE =
  /(\/(?:theme\/techizmet-shop|uploads\/shop)\/[^\s"'<>]+|\bURLSearchParams\b|\bURL\b\.createObjectURL)/g;

/** Görsel/JS yollarını çeviri dışında bırak (Skincare→Cilt Bakımı, Search→Arama URL kırılmasın) */
export function preserveNonTranslatable(html: string): { html: string; chunks: string[] } {
  const chunks: string[] = [];
  const mark = (chunk: string) => {
    const i = chunks.length;
    chunks.push(chunk);
    return `\x00KNPRESERVE${i}\x00`;
  };

  let out = html;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, mark);
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, mark);
  out = out.replace(
    new RegExp(`(\\s(?:${URL_ATTR_NAMES})\\s*=\\s*")([^"]*)(")`, "gi"),
    (full, pre, val, post) => {
      if (val.includes("/") || /\.(?:jpg|jpeg|png|webp|gif|svg|js|css|woff2?)/i.test(val)) {
        return `${pre}${mark(val)}${post}`;
      }
      return full;
    },
  );
  out = out.replace(PRESERVE_ANYWHERE, mark);
  return { html: out, chunks };
}

export function restorePreserved(html: string, chunks: string[]): string {
  return html.replace(/\x00KNPRESERVE(\d+)\x00/g, (_, i) => chunks[Number(i)] ?? "");
}

export function isTurkishMirrorPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  return /-tr\.html$/i.test(norm);
}

/** HTTrack HTML — farklı tire ve apostrof karakterlerini eşleştir */
export function normalizeMirrorText(html: string): string {
  return html
    .replace(/\u2019|\u2018|\u2032/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u00A0/g, " ");
}

export function applyMirrorTrReplacements(html: string): string {
  const { html: protectedHtml, chunks } = preserveNonTranslatable(html);
  let out = normalizeMirrorText(protectedHtml);
  for (const [en, tr] of getSortedPairs()) {
    const key = normalizeMirrorText(en);
    if (out.includes(key)) out = out.split(key).join(tr);
  }
  return restorePreserved(out, chunks);
}

/** Vitrin dili — TR/EN şablon metinlerini hedef dile çevir */
export function localizeMirrorHtml(html: string, _mirrorPath: string, locale: ShopLocale): string {
  if (locale === "tr") return applyMirrorTrReplacements(html);
  if (locale === "en") return applyMirrorEnHtml(html);
  return html;
}
