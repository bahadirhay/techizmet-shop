import { findMissingPrimaryPhrases, isPetFoodContext } from "@/lib/admin/product-seo/content-builders";
import { htmlToPlainText } from "@/lib/html-plain-text";

export type ProductSeoHealthStatus = "ok" | "warn" | "fail";

export type ProductSeoHealthItem = {
  id: string;
  label: string;
  status: ProductSeoHealthStatus;
  detail: string;
};

export type ProductSeoHealthInput = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
  descriptionHtml: string;
  keyFeaturesHtml: string;
  howToUseHtml: string;
  brandId: string;
  categoryId: string;
  imageUrl: string;
  barcode: string;
  published: boolean;
  homepageMode: "mirror" | "blocks";
  siteUrl?: string;
};

export function evaluateProductSeoHealth(input: ProductSeoHealthInput): ProductSeoHealthItem[] {
  const items: ProductSeoHealthItem[] = [];
  const title = input.title.trim();
  const seoTitle = input.seoTitle.trim();
  const seoDesc = input.seoDescription.trim();
  const slug = input.slug.trim();
  const bodyPlain =
    input.description.trim() ||
    (input.descriptionHtml.trim() ? htmlToPlainText(input.descriptionHtml) : "");
  const hasIntro = Boolean(bodyPlain);
  const hasFeatures = Boolean(input.keyFeaturesHtml.trim());
  const hasHowToUse = Boolean(input.howToUseHtml.trim());
  const previewUrl =
    input.siteUrl && slug ? `${input.siteUrl.replace(/\/$/, "")}/products/${slug}` : null;
  const pet = isPetFoodContext(title, []);

  items.push({
    id: "title",
    label: "Ürün adı",
    status: title.length >= 3 ? "ok" : "fail",
    detail: title.length >= 3 ? `"${title}"` : "Ürün adı zorunlu",
  });

  items.push({
    id: "category",
    label: "Kategori",
    status: input.categoryId.trim() ? "ok" : "warn",
    detail: input.categoryId.trim()
      ? "Seçili — Google ve pazaryeri eşlemesi için"
      : "Kategori seçin — SEO ve komisyon kuralları için",
  });

  items.push({
    id: "slug",
    label: "URL slug",
    status: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? "ok" : "warn",
    detail: slug ? `/products/${slug}` : "Slug girin",
  });

  items.push({
    id: "seo-title",
    label: "SEO başlık (meta)",
    status:
      seoTitle.length >= 25 && seoTitle.length <= 65
        ? "ok"
        : seoTitle.length > 0
          ? "warn"
          : "fail",
    detail: seoTitle
      ? `${seoTitle.length} karakter${seoTitle.length > 65 ? " — 60 civarı ideal" : ""}`
      : "Boş — «SEO çalışması yap» veya meta otomatik doldur",
  });

  items.push({
    id: "seo-desc",
    label: "SEO açıklama",
    status:
      seoDesc.length >= 70 && seoDesc.length <= 165
        ? "ok"
        : seoDesc.length > 0
          ? "warn"
          : "fail",
    detail: seoDesc
      ? `${seoDesc.length} karakter${seoDesc.length < 70 ? " — en az ~70 önerilir" : ""}`
      : "Boş — arama snippet'i zayıf kalır",
  });

  items.push({
    id: "brand",
    label: "Marka",
    status: input.brandId.trim() ? "ok" : "warn",
    detail: input.brandId.trim() ? "Seçili — JSON-LD brand alanı dolu" : "Marka seçin (şema + SEO)",
  });

  items.push({
    id: "image",
    label: "Kapak görseli",
    status: input.imageUrl.trim() ? "ok" : "warn",
    detail: input.imageUrl.trim() ? "OG görseli için kullanılır" : "Görsel ekleyin",
  });

  items.push({
    id: "body",
    label: "Ürün tanıtımı (Description)",
    status: hasIntro ? (bodyPlain.length >= 200 ? "ok" : "warn") : "warn",
    detail: hasIntro
      ? bodyPlain.length >= 200
        ? `${bodyPlain.length} karakter — web + pazaryeri`
        : `${bodyPlain.length} karakter — en az ~200 önerilir (SEO çalışması)`
      : "Tanıtım metni ekleyin veya SEO çalışması yapın",
  });

  if (pet) {
    const missing = findMissingPrimaryPhrases(bodyPlain);
    items.push({
      id: "primary-keywords",
      label: "Hedef aramalar (açıklama)",
      status: !hasIntro ? "fail" : missing.length === 0 ? "ok" : "fail",
      detail:
        missing.length === 0
          ? "Köpek ödül maması · Ödül maması · Doğal köpek ödül maması — hepsi geçiyor"
          : `Eksik: ${missing.join(", ")} — «SEO çalışması yap» ile doldurun`,
    });
  }

  items.push({
    id: "features",
    label: "Özellikler / besin değerleri",
    status: hasFeatures ? "ok" : "warn",
    detail: hasFeatures
      ? "Key Features — içerik, besin tablosu, faydalar"
      : "Pet food için besin değerleri buraya — SEO çalışması doldurur",
  });

  items.push({
    id: "how-to-use",
    label: "Kullanım talimatları",
    status: hasHowToUse ? "ok" : "warn",
    detail: hasHowToUse ? "Veriliş miktarı, saklama, uyarılar" : "How to Use — SEO çalışması ile oluşturulabilir",
  });

  items.push({
    id: "gtin",
    label: "Barkod (GTIN)",
    status: input.barcode.trim() ? "ok" : "warn",
    detail: input.barcode.trim()
      ? "JSON-LD gtin13 + pazaryeri eşleşmesi"
      : "Pazaryeri + zengin sonuç için önerilir",
  });

  if (input.homepageMode === "mirror") {
    items.push({
      id: "mirror",
      label: "Mirror vitrin",
      status: hasIntro && hasFeatures ? "ok" : "warn",
      detail:
        "Accordion alanları (Description, Features, How to Use) vitrin iframe'ine yazılır — meta alanları dış kabukta.",
    });
  }

  if (seoTitle && title && !seoTitle.toLowerCase().includes(title.toLowerCase().slice(0, 12))) {
    items.push({
      id: "title-align",
      label: "Meta ↔ ürün adı uyumu",
      status: "warn",
      detail: "SEO başlığı ürün adıyla ilişkili olmalı — tamamen farklı ifadelerden kaçının",
    });
  }

  if (previewUrl) {
    items.push({
      id: "preview",
      label: "Canlı önizleme",
      status: input.published ? "ok" : "warn",
      detail: previewUrl,
    });
  }

  return items;
}

export function seoHealthScore(items: ProductSeoHealthItem[]): number {
  if (!items.length) return 0;
  const scored = items.filter((i) => i.id !== "preview" && i.id !== "mirror");
  const points = scored.reduce((sum, i) => sum + (i.status === "ok" ? 1 : i.status === "warn" ? 0.5 : 0), 0);
  return Math.round((points / scored.length) * 100);
}
