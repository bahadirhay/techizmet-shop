import type { ProductRecommendHit } from "@/lib/whatsapp/product-recommend";

export type ProductRecommendReplyItem = Pick<
  ProductRecommendHit,
  "slug" | "title" | "priceLabel" | "url" | "reason"
>;

function productPath(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path || url;
  } catch {
    return url;
  }
}

export function formatRecommendHeadline(input: {
  breed: string;
  age: string;
  petTypeLabel?: string;
  count: number;
}): string {
  const parts = [input.petTypeLabel, input.breed.trim(), input.age.trim()].filter(Boolean);
  const who = parts.length ? parts.join(" · ") : "Dostunuz";
  return `${who} için ${input.count} öneri`;
}

export function formatProductRecommendReply(input: {
  breed: string;
  age: string;
  petTypeLabel?: string;
  hits: ProductRecommendReplyItem[];
}): string {
  const breed = input.breed.trim();
  const age = input.age.trim();
  const pet = input.petTypeLabel?.trim();

  const subjectParts = [pet, breed, age].filter(Boolean);
  const subject = subjectParts.length ? subjectParts.join(", ") : "dostunuz";

  if (!input.hits.length) {
    return `${subject} için şu an otomatik ürün eşleşmesi bulamadık. WhatsApp üzerinden ekibimiz size yardımcı olabilir.`;
  }

  const lines = input.hits.map((hit, i) => {
    const reason = hit.reason ? ` (${hit.reason})` : "";
    return `${i + 1}. ${hit.title} — ${hit.priceLabel}${reason}\n   ${productPath(hit.url)}`;
  });

  return `${subject} için önerilerimiz:\n\n${lines.join("\n\n")}`;
}
