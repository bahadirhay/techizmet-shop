/**
 * Mağaza vitrin başlıkları — başlıkta gramaj/adet yoksa weightGrams/pieceCount ile tamamlar.
 * Başlıkta zaten "100 gr", "5 Adet" vb. varsa tekrar eklenmez.
 */

export type ProductTitleUnitInput = {
  title: string;
  weightGrams?: number | null;
  pieceCount?: number | null;
};

function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Başlıkta gramaj ifadesi var mı (100g, 100 gr, 1,5 kg, 80gr.) */
export function titleHasWeight(text: string): boolean {
  return /\d+([.,]\d+)?\s*(?:g|gr|gram|kg)\.?/i.test(text);
}

/** Başlıkta adet/paket ifadesi var mı */
export function titleHasPieceCount(text: string): boolean {
  return /\d+\s*(?:adet|adt|'?li|'?lü|'?lu)(?:\s*paket)?\b/i.test(text);
}

/** 1500 → "1,5 kg", 100 → "100 gr" */
export function formatWeightInTitle(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    const label =
      kg % 1 === 0
        ? String(kg)
        : kg.toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `${label} kg`;
  }
  return `${grams} gr`;
}

/**
 * Başlıkta gramaj/adet yoksa alanlardan ekler; varsa başlığa dokunmaz.
 */
export function formatProductDisplayTitle(input: ProductTitleUnitInput): string {
  let t = normalizeTitle(input.title);
  if (!t) return t;

  if (titleHasWeight(t) || titleHasPieceCount(t)) {
    return t;
  }

  const weightGrams = input.weightGrams != null && input.weightGrams > 0 ? input.weightGrams : null;
  const pieceCount = input.pieceCount != null && input.pieceCount > 0 ? input.pieceCount : null;

  if (weightGrams != null) {
    t = `${t} ${formatWeightInTitle(weightGrams)}`;
  } else if (pieceCount != null) {
    t = pieceCount > 1 ? `${t} ${pieceCount} Adet` : `${t} 1 Adet`;
  }

  return t.trim();
}

export function withProductDisplayTitle<T extends ProductTitleUnitInput>(product: T): T {
  return { ...product, title: formatProductDisplayTitle(product) };
}

/** @deprecated Yalnızca görüntüleme katmanını kullanın; başlık alanını kayıtta değiştirmeyin. */
export function resolveStoredProductTitle(
  rawTitle: string,
  weightGrams?: number | null,
  pieceCount?: number | null,
): string {
  return formatProductDisplayTitle({ title: rawTitle, weightGrams, pieceCount });
}
