/** Mirror HTML (en-us) içindeki sabit İngilizce metinler → Türkçe */
export const MIRROR_TR_REPLACEMENTS: [string, string][] = [
  ["Home", "Ana Sayfa"],
  ["Best Sellers", "Çok Satanlar"],
  ["Collections", "Koleksiyonlar"],
  ["About", "Hakkımızda"],
  ["Contact", "İletişim"],
  ["Login", "Giriş"],
  ["Search", "Ara"],
  ["Cart", "Sepet"],
  ["Shop Now!", "Hemen Al!"],
  ["Continue Shopping", "Alışverişe devam"],
  ["All collections", "Tüm koleksiyonlar"],
  [
    "Free shipping on orders over €300 / $300 / £240",
    "300 TL üzeri siparişlerde ücretsiz kargo",
  ],
  [
    "Brightening Vitamin C Serum – ",
    "Aydınlatıcı C Vitamini Serumu – ",
  ],
];

export function applyMirrorTurkishStrings(html: string): string {
  let out = html;
  for (const [from, to] of MIRROR_TR_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}
