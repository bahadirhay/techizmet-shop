/**
 * Mağaza vitrin başlıkları — gramaj veya adet ürün adına eklenir (SEO + liste/PDP).
 */

export type ProductTitleUnitInput = {
  title: string;
  weightGrams?: number | null;
  pieceCount?: number | null;
};

function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function titleHasWeight(text: string): boolean {
  return /\d+([.,]\d+)?\s*(g|gr|gram|kg)\b/i.test(text);
}

export function titleHasPieceCount(text: string): boolean {
  return /\d+\s*(adet|'?li\s*paket|'?lü\s*paket|'?lu\s*paket|piece|pcs)\b/i.test(text);
}

/** 1500 → "1,5 kg", 100 → "100g" */
export function formatWeightInTitle(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    const label =
      kg % 1 === 0
        ? String(kg)
        : kg.toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${label} kg`;
  }
  return `${grams}g`;
}

/**
 * Başlıkta yoksa gramaj veya adet ekler. İkisi de varsa ve başlıkta yoksa ikisini de ekler.
 */
export function formatProductDisplayTitle(input: ProductTitleUnitInput): string {
  let t = normalizeTitle(input.title);
  if (!t) return t;

  const weightGrams = input.weightGrams != null && input.weightGrams > 0 ? input.weightGrams : null;
  const pieceCount = input.pieceCount != null && input.pieceCount > 0 ? input.pieceCount : null;

  if (!titleHasWeight(t) && weightGrams != null) {
    t = `${t} ${formatWeightInTitle(weightGrams)}`;
  } else if (!titleHasPieceCount(t) && pieceCount != null && pieceCount > 0) {
    t = pieceCount > 1 ? `${t} ${pieceCount} Adet` : `${t} 1 Adet`;
  }

  return t.trim();
}

export function withProductDisplayTitle<T extends ProductTitleUnitInput>(product: T): T {
  return { ...product, title: formatProductDisplayTitle(product) };
}

/** Admin kayıt — title + weight/piece ile kalıcı başlık */
export function resolveStoredProductTitle(
  rawTitle: string,
  weightGrams?: number | null,
  pieceCount?: number | null,
): string {
  return formatProductDisplayTitle({
    title: rawTitle,
    weightGrams,
    pieceCount,
  });
}
