/** Ürün sayfası — sepete ekle altı ikon şeridi (custom-icons) */

export type ProductHighlight = {
  label: string;
  iconUrl: string;
};

export const PRODUCT_HIGHLIGHT_SLOTS = 3;

export function emptyProductHighlights(): ProductHighlight[] {
  return Array.from({ length: PRODUCT_HIGHLIGHT_SLOTS }, () => ({ label: "", iconUrl: "" }));
}

export function parseProductHighlightsJson(raw: string | null | undefined): ProductHighlight[] {
  const base = emptyProductHighlights();
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < PRODUCT_HIGHLIGHT_SLOTS; i++) {
      const row = parsed[i] as { label?: string; iconUrl?: string } | undefined;
      if (!row) continue;
      base[i] = {
        label: String(row.label ?? "").trim(),
        iconUrl: String(row.iconUrl ?? "").trim(),
      };
    }
    return base;
  } catch {
    return base;
  }
}

export function serializeProductHighlights(items: ProductHighlight[]): string | null {
  const normalized = items.slice(0, PRODUCT_HIGHLIGHT_SLOTS).map((h) => ({
    label: h.label.trim(),
    iconUrl: h.iconUrl.trim(),
  }));
  while (normalized.length < PRODUCT_HIGHLIGHT_SLOTS) {
    normalized.push({ label: "", iconUrl: "" });
  }
  if (!normalized.some((h) => h.label || h.iconUrl)) return null;
  return JSON.stringify(normalized);
}

/** Vitrin yaması — en az bir etiket varsa döner */
export function productHighlightsForPatch(
  raw: string | null | undefined,
): ProductHighlight[] | null {
  const items = parseProductHighlightsJson(raw);
  if (!items.some((h) => h.label.trim())) return null;
  return items;
}
