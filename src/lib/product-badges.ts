/** Türkiye e-ticaretinde yaygın ürün rozetleri */
export const PRODUCT_BADGE_PRESETS = [
  { id: "new", label: "Yeni", color: "#059669", bg: "#d1fae5" },
  { id: "bestseller", label: "Çok satan", color: "#b45309", bg: "#fef3c7" },
  { id: "free_shipping", label: "Ücretsiz kargo", color: "#1d4ed8", bg: "#dbeafe" },
  { id: "editors_pick", label: "Tercih edilen", color: "#7c3aed", bg: "#ede9fe" },
  { id: "sale", label: "İndirim", color: "#dc2626", bg: "#fee2e2" },
  { id: "limited", label: "Sınırlı stok", color: "#c2410c", bg: "#ffedd5" },
  { id: "last_chance", label: "Son fırsat", color: "#be123c", bg: "#ffe4e6" },
  { id: "campaign", label: "Kampanya", color: "#0f766e", bg: "#ccfbf1" },
  { id: "online_exclusive", label: "Sadece online", color: "#4338ca", bg: "#e0e7ff" },
  { id: "new_season", label: "Yeni sezon", color: "#0369a1", bg: "#e0f2fe" },
  { id: "bundle", label: "Set / paket", color: "#4f46e5", bg: "#e0e7ff" },
  { id: "gift", label: "Hediye", color: "#a21caf", bg: "#fae8ff" },
] as const;

export type ProductBadgeId = (typeof PRODUCT_BADGE_PRESETS)[number]["id"];

export function parseProductBadges(raw: string | null | undefined): ProductBadgeId[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const ids = new Set(PRODUCT_BADGE_PRESETS.map((b) => b.id));
    return arr.filter((x): x is ProductBadgeId => typeof x === "string" && ids.has(x as ProductBadgeId));
  } catch {
    return [];
  }
}

export function serializeProductBadges(badges: ProductBadgeId[]): string {
  return JSON.stringify(badges);
}

export function badgePreset(id: string) {
  return PRODUCT_BADGE_PRESETS.find((b) => b.id === id);
}

const BADGE_LABEL_EN: Partial<Record<ProductBadgeId, string>> = {
  new: "New",
  bestseller: "Best seller",
  free_shipping: "Free shipping",
  editors_pick: "Editor's pick",
  sale: "Sale",
  limited: "Limited stock",
  last_chance: "Last chance",
  campaign: "Campaign",
  online_exclusive: "Online exclusive",
  new_season: "New season",
  bundle: "Bundle",
  gift: "Gift",
};

export function badgeLabelForLocale(id: ProductBadgeId, locale?: string): string {
  const preset = badgePreset(id);
  if (!preset) return id;
  if (locale?.toLowerCase().startsWith("en")) return BADGE_LABEL_EN[id] ?? preset.label;
  return preset.label;
}

/** İndirimli fiyat varsa otomatik indirim rozeti */
export function resolveDisplayBadges(
  manual: ProductBadgeId[],
  opts?: { compareAtMinor?: number | null; priceMinor?: number; stockQty?: number; lowStockThreshold?: number },
): ProductBadgeId[] {
  const set = new Set(manual);
  if (
    opts?.compareAtMinor != null &&
    opts.priceMinor != null &&
    opts.compareAtMinor > opts.priceMinor &&
    !set.has("sale")
  ) {
    set.add("sale");
  }
  if (
    opts?.stockQty != null &&
    opts.lowStockThreshold != null &&
    opts.stockQty > 0 &&
    opts.stockQty <= opts.lowStockThreshold &&
    !set.has("limited")
  ) {
    set.add("limited");
  }
  return [...set];
}
