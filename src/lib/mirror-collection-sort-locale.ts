/**
 * Koleksiyon sayfası sıralama menüsü (Shopify mirror HTML).
 * Tam ifadeler kısa anahtarlardan (Price, Featured) ÖNCE çevrilmeli — aksi halde TR+EN karışımı oluşur.
 */
export const MIRROR_COLLECTION_SORT_TR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Price, low to high", "Fiyat, düşükten yükseğe"],
  ["Price, high to low", "Fiyat, yüksekten düşüğe"],
  ["Date, old to new", "Tarih, eskiden yeniye"],
  ["Date, new to old", "Tarih, yeniden eskiye"],
  ["Alphabetically, A-Z", "Alfabetik, A–Z"],
  ["Alphabetically, Z-A", "Alfabetik, Z–A"],
  ["Most relevant", "En alakalı"],
  ["Best selling", "En çok satan"],
  ["Featured", "Öne çıkan"],
  ["Sort by", "Sırala"],
];
