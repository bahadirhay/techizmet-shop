import type { ProductRecommendHit } from "@/lib/whatsapp/product-recommend";

export function formatProductRecommendReply(input: {
  breed: string;
  age: string;
  petTypeLabel?: string;
  hits: ProductRecommendHit[];
}): string {
  const breed = input.breed.trim();
  const age = input.age.trim();
  const pet = input.petTypeLabel?.trim();

  const subjectParts = [pet, breed, age].filter(Boolean);
  const subject = subjectParts.length
    ? subjectParts.join(", ")
    : "dostunuz";

  if (!input.hits.length) {
    return `${subject} için şu an otomatik ürün eşleşmesi bulamadık. WhatsApp üzerinden ekibimiz size yardımcı olabilir.`;
  }

  const lines = input.hits.map((hit, i) => {
    const reason = hit.reason ? `\n   ${hit.reason}` : "";
    return `${i + 1}. ${hit.title} — ${hit.priceLabel}${reason}\n   ${hit.url}`;
  });

  return `${subject} için önerilerimiz:\n\n${lines.join("\n\n")}`;
}
