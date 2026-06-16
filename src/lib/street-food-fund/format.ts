/** Gram → kg etiketi (TR: virgül) */
export function formatFoodFundKg(grams: number, locale: "tr" | "en" = "tr"): string {
  const kg = grams / 1000;
  const text = kg >= 10 ? kg.toFixed(1) : kg.toFixed(2);
  return locale === "tr" ? text.replace(".", ",") : text;
}

export function foodFundProgressPercent(collectedGrams: number, targetGrams: number): number {
  if (targetGrams <= 0) return 0;
  return Math.min(100, Math.round((collectedGrams / targetGrams) * 100));
}
