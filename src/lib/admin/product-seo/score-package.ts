import {
  findMissingPrimaryPhrases,
  isPetFoodContext,
} from "@/lib/admin/product-seo/content-builders";
import { htmlToPlainText } from "@/lib/html-plain-text";

export type SeoScorePart = {
  id: string;
  label: string;
  points: number;
  max: number;
  detail: string;
};

export type SeoPackageScoreInput = {
  suggestedTitle: string;
  seoTitle: string;
  seoDescription: string;
  suggestedSlug: string;
  description?: string;
  descriptionHtml?: string;
  keyFeaturesHtml?: string;
  howToUseHtml?: string;
  highlightsCount?: number;
  keywords: string[];
  categoryTitles: string[];
  brandTitle?: string;
  marketplaceTitles?: Record<string, string>;
};

/** Tam SEO paketinin kalite skoru — tüm parçalar dolduğunda 100. */
export function scoreSeoPackage(input: SeoPackageScoreInput): {
  score: number;
  parts: SeoScorePart[];
} {
  const parts: SeoScorePart[] = [];
  const title = input.suggestedTitle.trim();
  const seoTitle = input.seoTitle.trim();
  const seoDesc = input.seoDescription.trim();
  const slug = input.suggestedSlug.trim();
  const bodyPlain =
    (input.description ?? "").trim() ||
    (input.descriptionHtml ? htmlToPlainText(input.descriptionHtml) : "");
  const hasFeatures = Boolean(input.keyFeaturesHtml?.trim());
  const hasHowTo = Boolean(input.howToUseHtml?.trim());
  const pet = isPetFoodContext(title, input.categoryTitles);

  // 10 — ürün adı uzunluğu
  {
    const max = 10;
    let points = 0;
    let detail: string;
    if (title.length >= 30 && title.length <= 100) {
      points = max;
      detail = `${title.length} karakter — ideal aralık`;
    } else if (title.length >= 20 && title.length <= 120) {
      points = 7;
      detail = `${title.length} karakter — 30–100 ideal`;
    } else if (title.length >= 3) {
      points = 3;
      detail = `${title.length} karakter — çok kısa/uzun`;
    } else {
      detail = "Ürün adı eksik";
    }
    parts.push({ id: "title", label: "Ürün adı", points, max, detail });
  }

  // 12 — meta başlık
  {
    const max = 12;
    let points = 0;
    let detail: string;
    if (seoTitle.length >= 25 && seoTitle.length <= 60) {
      points = max;
      detail = `${seoTitle.length} karakter — Google ideal`;
    } else if (seoTitle.length >= 25 && seoTitle.length <= 65) {
      points = 10;
      detail = `${seoTitle.length} karakter — kabul edilir`;
    } else if (seoTitle.length > 0) {
      points = 4;
      detail = `${seoTitle.length} karakter — 25–60 ideal`;
    } else {
      detail = "Meta başlık boş";
    }
    parts.push({ id: "seo-title", label: "Meta başlık", points, max, detail });
  }

  // 12 — meta açıklama
  {
    const max = 12;
    let points = 0;
    let detail: string;
    if (seoDesc.length >= 110 && seoDesc.length <= 160) {
      points = max;
      detail = `${seoDesc.length} karakter — snippet ideal`;
    } else if (seoDesc.length >= 70 && seoDesc.length <= 165) {
      points = 9;
      detail = `${seoDesc.length} karakter — kabul edilir`;
    } else if (seoDesc.length > 0) {
      points = 3;
      detail = `${seoDesc.length} karakter — 110–160 ideal`;
    } else {
      detail = "Meta açıklama boş";
    }
    parts.push({ id: "seo-desc", label: "Meta açıklama", points, max, detail });
  }

  // 14 — ürün tanıtımı
  {
    const max = 14;
    let points = 0;
    let detail: string;
    if (bodyPlain.length >= 280) {
      points = max;
      detail = `${bodyPlain.length} karakter — tam tanıtım`;
    } else if (bodyPlain.length >= 200) {
      points = 10;
      detail = `${bodyPlain.length} karakter — 280+ önerilir`;
    } else if (bodyPlain.length >= 80) {
      points = 5;
      detail = `${bodyPlain.length} karakter — kısa`;
    } else if (bodyPlain.length > 0) {
      points = 2;
      detail = `${bodyPlain.length} karakter — yetersiz`;
    } else {
      detail = "Tanıtım metni yok";
    }
    parts.push({ id: "body", label: "Ürün tanıtımı", points, max, detail });
  }

  // 10 — özellikler
  parts.push({
    id: "features",
    label: "Özellikler / besin",
    points: hasFeatures ? 10 : 0,
    max: 10,
    detail: hasFeatures ? "Key Features dolu" : "Özellikler / besin değerleri eksik",
  });

  // 8 — kullanım
  parts.push({
    id: "how-to",
    label: "Kullanım",
    points: hasHowTo ? 8 : 0,
    max: 8,
    detail: hasHowTo ? "How to Use dolu" : "Kullanım talimatı eksik",
  });

  // 8 — anahtar kelime örtüşmesi (başlık veya tanıtım)
  {
    const max = 8;
    const kws = input.keywords.slice(0, 5);
    const hay = `${title} ${bodyPlain}`.toLocaleLowerCase("tr-TR");
    const hits = kws.filter((kw) => hay.includes(kw.toLocaleLowerCase("tr-TR")));
    const petPrimaryOk = pet && findMissingPrimaryPhrases(bodyPlain).length === 0;
    let points = 0;
    let detail: string;
    if (!kws.length || petPrimaryOk || hits.length >= Math.min(3, Math.max(1, kws.length))) {
      points = max;
      detail = petPrimaryOk
        ? "Hedef aramalar içerikte — anahtar kelime seti karşılandı"
        : kws.length
          ? `${hits.length || kws.length}/${kws.length} örtüşme`
          : "Harici öneri yok — paket tamam";
    } else if (hits.length >= 1) {
      points = 5;
      detail = `${hits.length}/${kws.length} kelime — daha fazla örtüşme önerilir`;
    } else {
      points = 2;
      detail = "Anahtar kelimeler içerikte zayıf";
    }
    parts.push({ id: "keywords", label: "Anahtar kelimeler", points, max, detail });
  }

  // 5 — kategori
  parts.push({
    id: "category",
    label: "Kategori",
    points: input.categoryTitles.length ? 5 : 0,
    max: 5,
    detail: input.categoryTitles.length
      ? input.categoryTitles.slice(0, 2).join(" › ")
      : "Kategori seçilmedi",
  });

  // 5 — marka
  parts.push({
    id: "brand",
    label: "Marka",
    points: input.brandTitle?.trim() ? 5 : 0,
    max: 5,
    detail: input.brandTitle?.trim() ? input.brandTitle.trim() : "Marka seçilmedi",
  });

  // 8 — hedef arama ifadeleri (pet) / otomatik (diğer)
  {
    const max = 8;
    if (!pet) {
      parts.push({
        id: "primary",
        label: "Hedef aramalar",
        points: max,
        max,
        detail: "Pet ürünü değil — bu kriter otomatik tamam",
      });
    } else {
      const missing = findMissingPrimaryPhrases(bodyPlain);
      const points = missing.length === 0 ? max : missing.length === 1 ? 4 : 0;
      parts.push({
        id: "primary",
        label: "Hedef aramalar",
        points,
        max,
        detail:
          missing.length === 0
            ? "3 hedef ifade açıklamada geçiyor"
            : `Eksik: ${missing.join(", ")}`,
      });
    }
  }

  // 4 — pazaryeri başlıkları
  {
    const max = 4;
    const count = Object.values(input.marketplaceTitles ?? {}).filter((t) => t.trim()).length;
    const points = count >= 3 ? max : count >= 1 ? 2 : 0;
    parts.push({
      id: "marketplace",
      label: "Pazaryeri başlıkları",
      points,
      max,
      detail: count ? `${count} platform başlığı` : "Üretilmedi",
    });
  }

  // 2 — ikon şeridi
  {
    const max = 2;
    const n = input.highlightsCount ?? 0;
    parts.push({
      id: "highlights",
      label: "İkon şeridi",
      points: n >= 3 ? max : n > 0 ? 1 : 0,
      max,
      detail: n ? `${n} vurgu` : "Yok",
    });
  }

  // 2 — slug
  {
    const max = 2;
    const ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    parts.push({
      id: "slug",
      label: "URL slug",
      points: ok ? max : slug ? 1 : 0,
      max,
      detail: ok ? `/products/${slug}` : "Geçersiz veya boş slug",
    });
  }

  const score = Math.min(
    100,
    parts.reduce((sum, p) => sum + p.points, 0),
  );
  return { score, parts };
}

export function scoreLabel(score: number): string {
  if (score >= 95) return "mükemmel — yayın için hazır";
  if (score >= 75) return "iyi uyum";
  if (score >= 55) return "orta — eksikleri tamamlayın";
  return "zayıf — kategori, marka ve içeriği doldurun";
}
