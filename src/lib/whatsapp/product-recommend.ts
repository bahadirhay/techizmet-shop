import "server-only";

import { formatTry } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { stripHtmlForAssistant } from "@/lib/assistant/html";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

export type ProductRecommendHit = {
  slug: string;
  title: string;
  priceLabel: string;
  url: string;
  reason: string;
  score: number;
};

export type ProductRecommendInput = {
  siteId: string;
  breed: string;
  age: string;
  petType?: "dog" | "cat" | null;
  note?: string;
};

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function parseAgeHints(age: string): { tokens: string[]; label: string } {
  const lower = age.toLocaleLowerCase("tr").trim();
  if (!lower) return { tokens: [], label: "" };

  if (/yavru|puppy|civciv/.test(lower)) {
    return { tokens: ["yavru", "puppy", "küçük", "yetişkin"], label: "yavru" };
  }
  if (/yaşlı|yasli|senior|ihtiyar/.test(lower)) {
    return { tokens: ["yaşlı", "senior", "yetişkin", "adult"], label: "yaşlı" };
  }

  const monthMatch = /(\d+)\s*ay/.exec(lower);
  const yearMatch = /(\d+)\s*ya[sş]/.exec(lower);
  let months = 0;
  if (monthMatch) months = Number.parseInt(monthMatch[1]!, 10);
  if (yearMatch) months = Number.parseInt(yearMatch[1]!, 10) * 12;

  if (months > 0 && months < 12) {
    return { tokens: ["yavru", "puppy", "küçük"], label: "yavru" };
  }
  if (months >= 84) {
    return { tokens: ["yaşlı", "senior", "yetişkin"], label: "yaşlı" };
  }
  if (months >= 24) {
    return { tokens: ["yetişkin", "adult", "eğitim", "ödül"], label: "yetişkin" };
  }
  if (months > 0) {
    return { tokens: ["yetişkin", "genç", "ödül", "eğitim"], label: "genç" };
  }

  return { tokens: tokenize(lower), label: lower };
}

function breedSizeHints(breed: string): string[] {
  const lower = breed.toLocaleLowerCase("tr");
  const large =
    /kangal|akbash|çoban|malinois|rottweiler|doberman|labrador|golden|husky|shepherd|danua|mastiff|st\.?\s*bernard|great dane|alman kurdu|doberman/.test(
      lower,
    );
  const small =
    /chihuahua|pomeranian|pug|mops|yorkshire|maltese|toy|minyatür|mini|shih/.test(lower);
  if (large) return ["büyük", "çiğneme", "kemik", "tendon", "gırtlak", "deri"];
  if (small) return ["küçük", "hafif", "çıtır", "parça"];
  return [];
}

function productSearchBlob(p: {
  title: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
  keyFeaturesHtml: string | null;
  howToUseHtml: string | null;
  brand: { name: string } | null;
  categoryLinks: { category: { title: string } }[];
}): string {
  const parts = [
    p.title,
    p.slug.replace(/-/g, " "),
    p.brand?.name ?? "",
    ...p.categoryLinks.map((c) => c.category.title),
    p.description ?? "",
    p.descriptionHtml ? stripHtmlForAssistant(p.descriptionHtml) : "",
    p.keyFeaturesHtml ? stripHtmlForAssistant(p.keyFeaturesHtml) : "",
    p.howToUseHtml ? stripHtmlForAssistant(p.howToUseHtml) : "",
  ];
  return parts.join(" ").toLocaleLowerCase("tr");
}

function scoreProduct(
  blob: string,
  queryTokens: string[],
  ageTokens: string[],
  sizeTokens: string[],
  petType: "dog" | "cat" | null,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  for (const token of queryTokens) {
    if (blob.includes(token)) score += 2;
  }

  for (const token of ageTokens) {
    if (blob.includes(token)) {
      score += 3;
      if (!reasons.some((r) => r.includes("yaş"))) {
        reasons.push("Yaş grubuna uygun içerik bilgisi");
      }
    }
  }

  for (const token of sizeTokens) {
    if (blob.includes(token)) {
      score += 2;
      if (!reasons.some((r) => r.includes("ırk"))) {
        reasons.push("Irk boyutuna uygun ödül yapısı");
      }
    }
  }

  if (petType === "dog" && /köpek|dog/.test(blob)) {
    score += 2;
    reasons.push("Köpek ödül maması");
  }
  if (petType === "cat" && /kedi|cat/.test(blob)) {
    score += 2;
    reasons.push("Kedi ödül maması");
  }

  if (/doğal|katkısız|tek malzeme|protein/.test(blob)) {
    score += 1;
  }
  if (/eğitim|ödül|training|treat/.test(blob)) {
    score += 1;
    if (!reasons.length) reasons.push("Eğitim ve ödüllendirme için uygun");
  }
  if (/çıtır|kurutul/.test(blob) && sizeTokens.includes("küçük")) {
    score += 1;
  }

  if (!reasons.length && score > 0) {
    reasons.push("Ürün açıklaması verdiğiniz bilgilerle eşleşiyor");
  }

  return { score, reasons };
}

function pickReason(reasons: string[], title: string): string {
  if (reasons.length) return reasons[0]!;
  if (/gırtlak|tendon|kulak|deri/.test(title.toLocaleLowerCase("tr"))) {
    return "Çiğneme ihtiyacı olan köpekler için doğal ödül";
  }
  return "Mağaza ürün içeriğine göre önerildi";
}

export async function recommendProductsForPet(
  input: ProductRecommendInput,
): Promise<ProductRecommendHit[]> {
  const breed = input.breed.trim();
  const age = input.age.trim();
  const note = input.note?.trim() ?? "";
  if (!breed && !age && !note) return [];

  const ageHints = parseAgeHints(age);
  const breedTokens = tokenize(breed);
  const noteTokens = tokenize(note);
  const sizeTokens = breedSizeHints(breed);
  const queryTokens = [...new Set([...breedTokens, ...noteTokens, ...ageHints.tokens])];

  const products = await prisma.storeProduct.findMany({
    where: { siteId: input.siteId, published: true, stockQty: { gt: 0 } },
    select: {
      title: true,
      slug: true,
      priceMinor: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      brand: { select: { name: true } },
      categoryLinks: { select: { category: { select: { title: true } } } },
    },
    orderBy: { title: "asc" },
  });

  const scored = products
    .map((p) => {
      const blob = productSearchBlob(p);
      const { score, reasons } = scoreProduct(
        blob,
        queryTokens,
        ageHints.tokens,
        sizeTokens,
        input.petType ?? null,
      );
      return {
        slug: p.slug,
        title: p.title,
        priceLabel: formatTry(p.priceMinor),
        url: toAbsoluteUrl(`/products/${p.slug}`),
        reason: pickReason(reasons, p.title),
        score,
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "tr"));

  if (scored.length) return scored.slice(0, 5);

  // Eşleşme yoksa stoktaki köpek ödüllerini genel öneri olarak döndür
  const fallback = products
    .filter((p) => {
      const blob = productSearchBlob(p);
      if (input.petType === "cat") return /kedi|cat/.test(blob);
      if (input.petType === "dog") return /köpek|dog|ödül/.test(blob) || !/kedi|cat/.test(blob);
      return true;
    })
    .slice(0, 4)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      priceLabel: formatTry(p.priceMinor),
      url: toAbsoluteUrl(`/products/${p.slug}`),
      reason: "Popüler doğal ödül seçeneği",
      score: 0.1,
    }));

  return fallback;
}
