import type { Prisma } from "@prisma/client";

export type CollectionFilterKey = "price" | "brand" | "tones" | "volume" | "quantity" | "stock";

export type CollectionFilterFacetBrand = { slug: string; name: string; count: number };
export type CollectionFilterFacetValue = { value: string; count: number };

export type CollectionFilterFacets = {
  price: { minMinor: number; maxMinor: number };
  brands: CollectionFilterFacetBrand[];
  volumes: CollectionFilterFacetValue[];
  tones: CollectionFilterFacetValue[];
  quantities: CollectionFilterFacetValue[];
  stock: { inStock: number; outOfStock: number };
};

export type ActiveCollectionFilters = {
  priceMinMinor?: number;
  priceMaxMinor?: number;
  brandSlugs: string[];
  volumes: string[];
  tones: string[];
  quantities: string[];
  stockIn?: boolean;
  stockOut?: boolean;
};

export type FacetProductRow = {
  priceMinor: number;
  stockQty: number;
  weightGrams: number | null;
  pieceCount: number | null;
  variantOptionName: string | null;
  brand: { slug: string; name: string } | null;
  variants: { label: string; stockQty: number }[];
};

const EMPTY_FACETS: CollectionFilterFacets = {
  price: { minMinor: 0, maxMinor: 0 },
  brands: [],
  volumes: [],
  tones: [],
  quantities: [],
  stock: { inStock: 0, outOfStock: 0 },
};

export function emptyActiveCollectionFilters(): ActiveCollectionFilters {
  return { brandSlugs: [], volumes: [], tones: [], quantities: [] };
}

export function formatQuantityFilterLabel(value: string, isTr = true): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^\d+$/.test(trimmed)) return isTr ? `${trimmed} Adet` : `${trimmed} pcs`;
  return trimmed;
}

function parseGramsFromLabel(value: string): number | null {
  const m = value.trim().match(/(\d+)\s*(?:gr|g)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Varyant etiketinden hacim/ton boyutlarını çıkarır */
export function parseVariantDimensions(
  optionName: string | null | undefined,
  label: string,
): { volume?: string; tone?: string; quantity?: string } {
  const opt = (optionName ?? "").toLowerCase();
  const trimmed = label.trim();
  if (!trimmed) return {};

  const parts = trimmed.split(/\s*\/\s*|\s*\|\s*/).map((s) => s.trim()).filter(Boolean);

  if ((opt.includes("hacim") || opt.includes("volume")) && (opt.includes("ton") || opt.includes("shade"))) {
    return { volume: parts[0], tone: parts[1] ?? parts[0] };
  }
  if (opt.includes("adet") || opt.includes("quantity") || opt.includes("miktar") || opt.includes("paket")) {
    return { quantity: trimmed };
  }
  if (opt.includes("ton") || opt.includes("shade") || opt.includes("renk")) {
    return { tone: trimmed };
  }
  if (opt.includes("hacim") || opt.includes("volume") || opt.includes("gram") || opt.includes("ağırlık")) {
    return { volume: trimmed };
  }
  if (/\d+\s*(?:gr|g|ml|lt|l|kg)\b/i.test(trimmed)) {
    return { volume: trimmed };
  }
  return {};
}

function bump(map: Map<string, number>, value: string) {
  const key = value.trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function buildCollectionFilterFacets(products: FacetProductRow[]): CollectionFilterFacets {
  if (!products.length) return { ...EMPTY_FACETS };

  const brandMap = new Map<string, { name: string; count: number }>();
  const volumeMap = new Map<string, number>();
  const toneMap = new Map<string, number>();
  const quantityMap = new Map<string, number>();
  let minMinor = products[0].priceMinor;
  let maxMinor = products[0].priceMinor;
  let inStock = 0;
  let outOfStock = 0;

  for (const product of products) {
    minMinor = Math.min(minMinor, product.priceMinor);
    maxMinor = Math.max(maxMinor, product.priceMinor);

    const available = product.stockQty > 0 || product.variants.some((v) => v.stockQty > 0);
    if (available) inStock += 1;
    else outOfStock += 1;

    if (product.brand?.slug) {
      const prev = brandMap.get(product.brand.slug);
      brandMap.set(product.brand.slug, {
        name: product.brand.name,
        count: (prev?.count ?? 0) + 1,
      });
    }

    if (product.pieceCount && product.pieceCount > 0) {
      bump(quantityMap, String(product.pieceCount));
    }

    if (product.weightGrams && product.weightGrams > 0) {
      bump(volumeMap, `${product.weightGrams} gr`);
    }

    if (product.variants.length) {
      for (const variant of product.variants) {
        const dims = parseVariantDimensions(product.variantOptionName, variant.label);
        if (dims.quantity) bump(quantityMap, dims.quantity);
        if (dims.volume) bump(volumeMap, dims.volume);
        if (dims.tone) bump(toneMap, dims.tone);
      }
    }
  }

  const sortValues = (map: Map<string, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, "tr"));

  return {
    price: { minMinor, maxMinor },
    brands: [...brandMap.entries()]
      .map(([slug, row]) => ({ slug, name: row.name, count: row.count }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    volumes: sortValues(volumeMap),
    tones: sortValues(toneMap),
    quantities: sortValues(quantityMap),
    stock: { inStock, outOfStock },
  };
}

function parseListParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  return joined
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMinorFromTryInput(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

export function parseCollectionFilterParams(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): ActiveCollectionFilters {
  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
    const v = input[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const stockRaw = get("stock");
  const stockParts = parseListParam(stockRaw);

  return {
    priceMinMinor: parseMinorFromTryInput(get("price_min")),
    priceMaxMinor: parseMinorFromTryInput(get("price_max")),
    brandSlugs: parseListParam(get("brand")),
    volumes: parseListParam(get("volume")),
    tones: parseListParam(get("tone")),
    quantities: parseListParam(get("quantity")),
    stockIn: stockParts.includes("in") || stockRaw === "in",
    stockOut: stockParts.includes("out") || stockRaw === "out",
  };
}

export function filtersToSearchParams(
  filters: ActiveCollectionFilters,
  base?: URLSearchParams,
): URLSearchParams {
  const p = new URLSearchParams(base?.toString() ?? "");
  p.delete("page");

  const setList = (key: string, values: string[]) => {
    p.delete(key);
    if (values.length) p.set(key, values.join(","));
  };

  if (filters.priceMinMinor != null) p.set("price_min", String(Math.round(filters.priceMinMinor / 100)));
  else p.delete("price_min");

  if (filters.priceMaxMinor != null) p.set("price_max", String(Math.round(filters.priceMaxMinor / 100)));
  else p.delete("price_max");

  setList("brand", filters.brandSlugs);
  setList("volume", filters.volumes);
  setList("tone", filters.tones);
  setList("quantity", filters.quantities);

  const stock: string[] = [];
  if (filters.stockIn) stock.push("in");
  if (filters.stockOut) stock.push("out");
  setList("stock", stock);

  return p;
}

export function buildProductFilterWhere(
  filters: ActiveCollectionFilters,
  enabled: Partial<Record<CollectionFilterKey, boolean>>,
): Prisma.StoreProductWhereInput | undefined {
  const and: Prisma.StoreProductWhereInput[] = [];

  if (enabled.price !== false) {
    if (filters.priceMinMinor != null) and.push({ priceMinor: { gte: filters.priceMinMinor } });
    if (filters.priceMaxMinor != null) and.push({ priceMinor: { lte: filters.priceMaxMinor } });
  }

  if (enabled.brand !== false && filters.brandSlugs.length) {
    and.push({ brand: { slug: { in: filters.brandSlugs } } });
  }

  if (enabled.stock !== false && (filters.stockIn || filters.stockOut) && !(filters.stockIn && filters.stockOut)) {
    if (filters.stockIn) {
      and.push({
        OR: [{ stockQty: { gt: 0 } }, { variants: { some: { stockQty: { gt: 0 } } } }],
      });
    }
    if (filters.stockOut) {
      and.push({
        AND: [{ stockQty: { lte: 0 } }, { variants: { none: { stockQty: { gt: 0 } } } }],
      });
    }
  }

  if (enabled.volume !== false && filters.volumes.length) {
    and.push({
      OR: filters.volumes.flatMap((value) => {
        const grams = parseGramsFromLabel(value);
        const clauses: Prisma.StoreProductWhereInput[] = [
          { variants: { some: { label: { contains: value, mode: "insensitive" } } } },
        ];
        if (grams != null) {
          clauses.push({ weightGrams: grams, variants: { none: {} } });
        }
        return clauses;
      }),
    });
  }

  if (enabled.tones !== false && filters.tones.length) {
    and.push({
      OR: filters.tones.map((value) => ({
        variants: { some: { label: { contains: value, mode: "insensitive" } } },
      })),
    });
  }

  if (enabled.quantity !== false && filters.quantities.length) {
    const pieceCounts = filters.quantities
      .map((value) => parseInt(value.replace(/\D/g, ""), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (pieceCounts.length) {
      and.push({
        OR: [
          { pieceCount: { in: pieceCounts } },
          ...filters.quantities.map((value) => ({
            variants: { some: { label: { contains: value, mode: "insensitive" as const } } },
          })),
        ],
      });
    }
  }

  if (!and.length) return undefined;
  return { AND: and };
}

export function filtersCacheKey(filters: ActiveCollectionFilters): string {
  return JSON.stringify({
    priceMinMinor: filters.priceMinMinor ?? null,
    priceMaxMinor: filters.priceMaxMinor ?? null,
    brandSlugs: [...filters.brandSlugs].sort(),
    volumes: [...filters.volumes].sort(),
    tones: [...filters.tones].sort(),
    quantities: [...filters.quantities].sort(),
    stockIn: filters.stockIn ?? false,
    stockOut: filters.stockOut ?? false,
  });
}

export function hasActiveCollectionFilters(filters: ActiveCollectionFilters): boolean {
  return Boolean(
    filters.priceMinMinor != null ||
      filters.priceMaxMinor != null ||
      filters.brandSlugs.length ||
      filters.volumes.length ||
      filters.tones.length ||
      filters.quantities.length ||
      filters.stockIn ||
      filters.stockOut,
  );
}
