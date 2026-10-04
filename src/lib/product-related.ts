/** PDP “Önerilen ürünler” ayarları */

export type RelatedProductsMode = "off" | "auto" | "manual";

export type RelatedProductsSettings = {
  mode: RelatedProductsMode;
  /** Manuel seçim — sıra korunur */
  productSlugs: string[];
  /** null/0 = hepsi */
  count: number | null;
  /** Masaüstü sütun sayısı */
  columns: 2 | 3 | 4;
};

export const DEFAULT_RELATED_PRODUCTS: RelatedProductsSettings = {
  mode: "auto",
  productSlugs: [],
  count: null,
  columns: 4,
};

function normalizeColumns(value: unknown): 2 | 3 | 4 {
  const n = Number(value);
  if (n === 2 || n === 3 || n === 4) return n;
  return 4;
}

function normalizeCount(value: unknown): number | null {
  if (value == null || value === "" || value === 0) return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, 48);
}

export function parseRelatedProductsJson(raw: string | null | undefined): RelatedProductsSettings {
  if (!raw?.trim()) return { ...DEFAULT_RELATED_PRODUCTS };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const modeRaw = String(parsed.mode ?? "auto");
    const mode: RelatedProductsMode =
      modeRaw === "off" || modeRaw === "manual" || modeRaw === "auto" ? modeRaw : "auto";
    const slugs = Array.isArray(parsed.productSlugs)
      ? parsed.productSlugs.map((s) => String(s).trim()).filter(Boolean)
      : [];
    return {
      mode,
      productSlugs: slugs,
      count: normalizeCount(parsed.count),
      columns: normalizeColumns(parsed.columns),
    };
  } catch {
    return { ...DEFAULT_RELATED_PRODUCTS };
  }
}

export function serializeRelatedProducts(settings: RelatedProductsSettings): string {
  return JSON.stringify({
    mode: settings.mode,
    productSlugs: settings.mode === "manual" ? settings.productSlugs.filter(Boolean) : [],
    count: settings.count,
    columns: settings.columns,
  });
}
