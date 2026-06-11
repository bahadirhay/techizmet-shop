import type { ProductHighlight } from "@/lib/product-highlights";
import { PRODUCT_HIGHLIGHT_SLOTS } from "@/lib/product-highlights";
import { isPetFoodContext } from "@/lib/admin/product-seo/content-builders";

const THEME_ICON = {
  natural: "/theme/techizmet-shop/cdn/shop/files/Natural_Ingredients7568.svg",
  protein: "/theme/techizmet-shop/cdn/shop/files/Nourish_Repair639c.svg",
  training: "/theme/techizmet-shop/cdn/shop/files/Gentle_Formula639c.svg",
  crunchy: "/theme/techizmet-shop/cdn/shop/files/Deep_Moisture639c.svg",
  pure: "/theme/techizmet-shop/cdn/shop/files/Natural_Glow639c.svg",
  quality: "/theme/techizmet-shop/cdn/shop/files/Clinically_Tested639c.svg",
  skin: "/theme/techizmet-shop/cdn/shop/files/Skin_Renewal639c.svg",
  hydrate: "/theme/techizmet-shop/cdn/shop/files/hydrating590f.svg",
} as const;

type HighlightCandidate = {
  label: string;
  iconUrl: string;
  score: number;
};

function addCandidate(list: HighlightCandidate[], label: string, iconUrl: string, score: number) {
  if (!label.trim()) return;
  const existing = list.find((c) => c.label.toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.score = Math.max(existing.score, score);
    return;
  }
  list.push({ label: label.trim(), iconUrl, score });
}

/** Ürün adı / kategoriye göre vitrin ikon şeridi önerisi */
export function suggestProductHighlights(input: {
  title: string;
  categoryTitles: string[];
  brandTitle?: string;
  isPetFood?: boolean;
}): ProductHighlight[] {
  const pet = input.isPetFood ?? isPetFoodContext(input.title, input.categoryTitles);
  const blob = [input.title, ...input.categoryTitles, input.brandTitle ?? ""].join(" ").toLowerCase();
  const candidates: HighlightCandidate[] = [];

  if (pet) {
    addCandidate(candidates, "%100 Doğal İçerik", THEME_ICON.natural, 50);
    addCandidate(candidates, "Katkısız Formül", THEME_ICON.pure, 45);

    if (/akci[ğg]er|ci[ğg]er|protein|et|dana|kuzu|tavuk|bal[ıi]k/.test(blob)) {
      addCandidate(candidates, "Yüksek Protein", THEME_ICON.protein, 60);
    }
    if (/ödül|eğitim|training|snack|treat/.test(blob)) {
      addCandidate(candidates, "Eğitim Ödülü", THEME_ICON.training, 58);
    }
    if (/çıtır|kurutul|dried|hafif/.test(blob)) {
      addCandidate(candidates, "Çıtır Yapı", THEME_ICON.crunchy, 52);
    }
    if (/tek\s*malzeme|single|monoprotein|sade/.test(blob)) {
      addCandidate(candidates, "Tek Malzeme", THEME_ICON.natural, 55);
    }
    if (/tendon|kemik|deri|kulak|dental|diş/.test(blob)) {
      addCandidate(candidates, "Diş ve Diş Eti", THEME_ICON.quality, 54);
    }
    if (/yavru|puppy|kitten|yetişkin|adult|senior|yaşlı/.test(blob)) {
      addCandidate(candidates, "Yaşa Uygun", THEME_ICON.training, 48);
    }
    if (/hipoalerjenik|gluten|tah[ıi]ls[ıi]z|grain.?free/.test(blob)) {
      addCandidate(candidates, "Tahılsız / Hafif", THEME_ICON.pure, 50);
    }
    if (/köpek|dog/.test(blob)) {
      addCandidate(candidates, "Köpekler İçin", THEME_ICON.training, 40);
    }
    if (/kedi|cat/.test(blob)) {
      addCandidate(candidates, "Kediler İçin", THEME_ICON.training, 40);
    }
  } else {
    addCandidate(candidates, "Kaliteli Formül", THEME_ICON.quality, 50);
    addCandidate(candidates, "Doğal İçerik", THEME_ICON.natural, 48);
    if (/nem|hydr|moistur/.test(blob)) {
      addCandidate(candidates, "Derin Nem", THEME_ICON.hydrate, 55);
    }
    if (/cilt|skin|yüz|face/.test(blob)) {
      addCandidate(candidates, "Cilt Yenileme", THEME_ICON.skin, 55);
    }
    if (/spf|güneş|sun/.test(blob)) {
      addCandidate(candidates, "Güneş Koruması", THEME_ICON.pure, 55);
    }
    if (/vitamin|serum|anti/.test(blob)) {
      addCandidate(candidates, "Aktif Formül", THEME_ICON.protein, 52);
    }
  }

  if (input.brandTitle?.trim()) {
    addCandidate(candidates, input.brandTitle.trim(), THEME_ICON.quality, 35);
  }

  const top = candidates.sort((a, b) => b.score - a.score).slice(0, PRODUCT_HIGHLIGHT_SLOTS);

  while (top.length < PRODUCT_HIGHLIGHT_SLOTS) {
    top.push({
      label: pet ? "Güvenilir Ödül" : "Güvenilir Seçim",
      iconUrl: pet ? THEME_ICON.natural : THEME_ICON.quality,
      score: 0,
    });
  }

  return top.map(({ label, iconUrl }) => ({ label, iconUrl }));
}
