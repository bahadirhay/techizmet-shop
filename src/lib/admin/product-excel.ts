import * as XLSX from "xlsx";
import { slugify } from "@/lib/admin/slug";
import { minorToTry, tryToMinor } from "@/lib/admin/money";
import {
  PRODUCT_BADGE_PRESETS,
  serializeProductBadges,
  type ProductBadgeId,
} from "@/lib/product-badges";
import { resolveStoredProductTitle } from "@/lib/product-display-title";

/** Excel sütun başlıkları (ShopPHP tarzı Türkçe) */
export const PRODUCT_EXCEL_HEADERS = [
  "ID",
  "Ürün Adı",
  "Slug",
  "SKU",
  "Barkod",
  "Kategori (slug)",
  "Marka (slug)",
  "Koleksiyon (slug)",
  "Fiyat (TL)",
  "Karşılaştırma Fiyatı (TL)",
  "Maliyet (TL)",
  "Stok",
  "Düşük Stok Eşiği",
  "Ağırlık (g)",
  "Desi",
  "Görsel URL",
  "Etiketler",
  "Yayında",
  "SEO Başlık",
  "SEO Açıklama",
  "Açıklama",
] as const;

const HEADER_ALIASES: Record<string, keyof ParsedProductRow> = {
  id: "id",
  "ürün adı": "title",
  "urun adi": "title",
  title: "title",
  slug: "slug",
  sku: "sku",
  barkod: "barcode",
  barcode: "barcode",
  "kategori (slug)": "categorySlug",
  "kategori slug": "categorySlug",
  category: "categorySlug",
  "marka (slug)": "brandSlug",
  "marka slug": "brandSlug",
  brand: "brandSlug",
  "koleksiyon (slug)": "collectionSlug",
  "koleksiyon slug": "collectionSlug",
  collection: "collectionSlug",
  "fiyat (tl)": "price",
  fiyat: "price",
  price: "price",
  "karşılaştırma fiyatı (tl)": "compareAt",
  "karsilastirma fiyati": "compareAt",
  "maliyet (tl)": "cost",
  maliyet: "cost",
  stok: "stockQty",
  stock: "stockQty",
  "düşük stok eşiği": "lowStockThreshold",
  "dusuk stok esigi": "lowStockThreshold",
  "ağırlık (g)": "weightGrams",
  agirlik: "weightGrams",
  desi: "desi",
  "görsel url": "imageUrl",
  "gorsel url": "imageUrl",
  image: "imageUrl",
  etiketler: "badges",
  badges: "badges",
  yayında: "published",
  yayinda: "published",
  published: "published",
  aktif: "published",
  "seo başlık": "seoTitle",
  "seo baslik": "seoTitle",
  "seo açıklama": "seoDescription",
  "seo aciklama": "seoDescription",
  açıklama: "description",
  aciklama: "description",
  description: "description",
};

export type ParsedProductRow = {
  rowNum: number;
  id?: string;
  title?: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  categorySlug?: string;
  brandSlug?: string;
  collectionSlug?: string;
  price?: string;
  compareAt?: string;
  cost?: string;
  stockQty?: string;
  lowStockThreshold?: string;
  weightGrams?: string;
  desi?: string;
  imageUrl?: string;
  badges?: string;
  published?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
};

export type ProductExportRow = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  barcode: string;
  categorySlug: string;
  brandSlug: string;
  collectionSlug: string;
  price: string;
  compareAt: string;
  cost: string;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: string;
  desi: string;
  imageUrl: string;
  badges: string;
  published: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
};

export function productToExcelRow(p: {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  category?: { slug: string } | null;
  categoryLinks?: { category: { slug: string } }[];
  brand?: { slug: string } | null;
  collection?: { slug: string } | null;
  priceMinor: number;
  compareAtMinor: number | null;
  costMinor: number | null;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  desi: number | null;
  imageUrl: string | null;
  badgesJson: string | null;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
}): ProductExportRow {
  let badgeIds = "";
  try {
    const arr = JSON.parse(p.badgesJson ?? "[]") as string[];
    badgeIds = Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    badgeIds = "";
  }
  const categorySlugs = [
    ...(p.category?.slug ? [p.category.slug] : []),
    ...((p.categoryLinks ?? []).map((link) => link.category.slug).filter((slug) => slug !== p.category?.slug)),
  ];
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    categorySlug: categorySlugs.join(", "),
    brandSlug: p.brand?.slug ?? "",
    collectionSlug: p.collection?.slug ?? "",
    price: minorToTry(p.priceMinor),
    compareAt: p.compareAtMinor ? minorToTry(p.compareAtMinor) : "",
    cost: p.costMinor ? minorToTry(p.costMinor) : "",
    stockQty: p.stockQty,
    lowStockThreshold: p.lowStockThreshold,
    weightGrams: p.weightGrams != null ? String(p.weightGrams) : "",
    desi: p.desi != null ? String(p.desi) : "",
    imageUrl: p.imageUrl ?? "",
    badges: badgeIds,
    published: p.published ? "Evet" : "Hayır",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    description: p.description ?? "",
  };
}

export function buildProductsWorkbook(rows: ProductExportRow[]): Buffer {
  const data = [
    [...PRODUCT_EXCEL_HEADERS],
    ...rows.map((r) => [
      r.id,
      r.title,
      r.slug,
      r.sku,
      r.barcode,
      r.categorySlug,
      r.brandSlug,
      r.collectionSlug,
      r.price,
      r.compareAt,
      r.cost,
      r.stockQty,
      r.lowStockThreshold,
      r.weightGrams,
      r.desi,
      r.imageUrl,
      r.badges,
      r.published,
      r.seoTitle,
      r.seoDescription,
      r.description,
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = PRODUCT_EXCEL_HEADERS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Ürünler");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePublished(raw: string | undefined): boolean {
  if (!raw?.trim()) return true;
  const v = raw.trim().toLowerCase();
  if (["hayır", "hayir", "no", "0", "false", "pasif"].includes(v)) return false;
  return true;
}

function parseBadges(raw: string | undefined): ProductBadgeId[] {
  if (!raw?.trim()) return [];
  const ids = new Set(PRODUCT_BADGE_PRESETS.map((b) => b.id));
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter((x): x is ProductBadgeId => ids.has(x as ProductBadgeId));
}

export function parseProductsWorkbook(buffer: Buffer): ParsedProductRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];

  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number)[][];

  if (matrix.length < 2) return [];

  const headerRow = matrix[0].map((c) => normalizeHeader(String(c ?? "")));
  const colMap: (keyof ParsedProductRow | null)[] = headerRow.map((h) => HEADER_ALIASES[h] ?? null);

  const rows: ParsedProductRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line?.length) continue;
    const row: ParsedProductRow = { rowNum: i + 1 };
    let hasData = false;
    for (let c = 0; c < colMap.length; c++) {
      const key = colMap[c];
      if (!key || key === "rowNum") continue;
      const val = String(line[c] ?? "").trim();
      if (val) hasData = true;
      row[key] = val;
    }
    if (hasData && row.title?.trim()) rows.push(row);
  }
  return rows;
}

export type ImportProductData = {
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryIds: string[];
  brandId: string | null;
  collectionId: string | null;
  priceMinor: number;
  compareAtMinor: number | null;
  costMinor: number | null;
  stockQty: number;
  lowStockThreshold: number;
  weightGrams: number | null;
  desi: number | null;
  imageUrl: string | null;
  badgesJson: string;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
};

export function parsedRowToProductData(
  row: ParsedProductRow,
  lookup: {
    categoryBySlug: Map<string, string>;
    brandBySlug: Map<string, string>;
    collectionBySlug: Map<string, string>;
  },
): ImportProductData | { error: string } {
  const title = row.title?.trim();
  if (!title) return { error: "Ürün adı boş" };

  const slug = row.slug?.trim() ? slugify(row.slug) : slugify(title);
  const catSlugs = [...new Set(
    (row.categorySlug ?? "")
      .split(/[,;|]/)
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  )];
  const brandSlug = row.brandSlug?.trim().toLowerCase();
  const collSlug = row.collectionSlug?.trim().toLowerCase();

  for (const catSlug of catSlugs) {
    if (!lookup.categoryBySlug.has(catSlug)) {
      return { error: `Kategori bulunamadı: ${catSlug}` };
    }
  }
  if (brandSlug && !lookup.brandBySlug.has(brandSlug)) {
    return { error: `Marka bulunamadı: ${row.brandSlug}` };
  }
  if (collSlug && !lookup.collectionBySlug.has(collSlug)) {
    return { error: `Koleksiyon bulunamadı: ${row.collectionSlug}` };
  }

  const weightGrams = row.weightGrams?.trim() ? parseInt(row.weightGrams, 10) : null;

  return {
    title: resolveStoredProductTitle(title, weightGrams, null),
    slug,
    sku: row.sku?.trim() || null,
    barcode: row.barcode?.trim() || null,
    categoryId: catSlugs[0] ? (lookup.categoryBySlug.get(catSlugs[0]) ?? null) : null,
    categoryIds: catSlugs
      .map((catSlug) => lookup.categoryBySlug.get(catSlug) ?? "")
      .filter(Boolean),
    brandId: brandSlug ? (lookup.brandBySlug.get(brandSlug) ?? null) : null,
    collectionId: collSlug ? (lookup.collectionBySlug.get(collSlug) ?? null) : null,
    priceMinor: tryToMinor(row.price ?? "0"),
    compareAtMinor: row.compareAt?.trim() ? tryToMinor(row.compareAt) : null,
    costMinor: row.cost?.trim() ? tryToMinor(row.cost) : null,
    stockQty: parseInt(String(row.stockQty ?? "0"), 10) || 0,
    lowStockThreshold: parseInt(String(row.lowStockThreshold ?? "5"), 10) || 5,
    weightGrams,
    desi: row.desi?.trim() ? parseFloat(row.desi.replace(",", ".")) : null,
    imageUrl: row.imageUrl?.trim() || null,
    badgesJson: serializeProductBadges(parseBadges(row.badges)),
    published: parsePublished(row.published),
    seoTitle: row.seoTitle?.trim() || null,
    seoDescription: row.seoDescription?.trim() || null,
    description: row.description?.trim() || null,
  };
}
