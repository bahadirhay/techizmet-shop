import type { ShopLocale } from "@/lib/i18n/locale";
import { applyMirrorEnReplacements } from "@/lib/mirror-en-locale";

/** Slug → İngilizce kategori adı (admin’de yalnızca TR title olsa bile) */
const CATEGORY_EN_BY_SLUG: Record<string, string> = {
  "cilt-bakimi": "Skin Care",
  "sac-bakimi": "Hair Care",
  "vucut-bakimi": "Body Care",
  "gunes-koruma": "Sun Protection",
  "nemlendiriciler": "Moisturizers",
  "temizleme-tonik": "Cleansing / Toner",
  "temizleme-tonikler": "Cleansing / Toner",
  "yuz-maskeleri": "Face Masks",
  serumlar: "Serums",
  "sac-kremleri": "Hair Creams",
  "sac-sampuanlari": "Shampoos",
  "sac-sampuan": "Shampoos",
  "ayak-bakimi": "Foot Care",
  "bacak-bakimi": "Leg Care",
  "karin-bakimi": "Abdominal Care",
};

/** Türkçe başlık → İngilizce (slug bilinmiyorsa) */
const CATEGORY_EN_BY_TITLE: Record<string, string> = {
  "Cilt Bakımı": "Skin Care",
  "Saç Bakımı": "Hair Care",
  "Vücut Bakımı": "Body Care",
  "Güneş Koruma": "Sun Protection",
  Nemlendiriciler: "Moisturizers",
  "Temizleme / Tonik": "Cleansing / Toner",
  "Yüz Maskeleri": "Face Masks",
  Serumlar: "Serums",
  "Saç Kremleri": "Hair Creams",
  "Saç Şampuanı": "Shampoo",
  "Saç Şampuanları": "Shampoos",
  "Ayak Bakımı": "Foot Care",
  "Bacak Bakımı": "Leg Care",
  "Karın Bakımı": "Abdominal Care",
};

export function categoryDisplayTitle(
  cat: { slug: string; title: string },
  locale: ShopLocale,
): string {
  if (locale === "tr") return cat.title;
  const bySlug = CATEGORY_EN_BY_SLUG[cat.slug];
  if (bySlug) return bySlug;
  const byTitle = CATEGORY_EN_BY_TITLE[cat.title.trim()];
  if (byTitle) return byTitle;
  return applyMirrorEnReplacements(cat.title);
}
