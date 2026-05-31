import type { VariantFormRow } from "@/lib/product-variants";
import { tryToMinor } from "@/lib/admin/money";
import type { Prisma, PrismaClient } from "@prisma/client";

type ProductDb = Prisma.TransactionClient | PrismaClient;

export type VariantInput = {
  id?: string;
  label: string;
  price: string;
  compareAt: string;
  stockQty: string;
  sku: string;
  isDefault: boolean;
};

export function parseVariantInputs(raw: unknown): VariantInput[] {
  if (!Array.isArray(raw)) return [];
  const out: VariantInput[] = [];
  for (const row of raw) {
    const o = row as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    if (!label) continue;
    out.push({
      id: typeof o.id === "string" ? o.id : undefined,
      label,
      price: String(o.price ?? "").trim(),
      compareAt: String(o.compareAt ?? "").trim(),
      stockQty: String(o.stockQty ?? "0").trim(),
      sku: String(o.sku ?? "").trim(),
      isDefault: Boolean(o.isDefault),
    });
  }
  return out;
}

export async function upsertProductVariants(
  tx: ProductDb,
  productId: string,
  optionName: string | null,
  variants: VariantInput[],
) {
  await tx.storeProduct.update({
    where: { id: productId },
    data: { variantOptionName: optionName },
  });

  const existing = await tx.storeProductVariant.findMany({ where: { productId } });
  const keepIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);

  for (const row of existing) {
    if (!keepIds.has(row.id)) await tx.storeProductVariant.delete({ where: { id: row.id } });
  }

  let defaultSet = variants.some((v) => v.isDefault);
  const rows = variants.map((v, i) => ({
    ...v,
    isDefault: !defaultSet && i === 0 ? true : v.isDefault,
  }));
  if (!rows.some((r) => r.isDefault) && rows.length) rows[0]!.isDefault = true;

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i]!;
    const data = {
      label: v.label,
      sku: v.sku || null,
      priceMinor: tryToMinor(v.price),
      compareAtMinor: v.compareAt ? tryToMinor(v.compareAt) : null,
      stockQty: parseInt(v.stockQty, 10) || 0,
      sortOrder: i,
      isDefault: v.isDefault,
    };
    if (v.id && existing.some((e) => e.id === v.id)) {
      await tx.storeProductVariant.update({ where: { id: v.id }, data });
    } else {
      await tx.storeProductVariant.create({ data: { productId, ...data } });
    }
  }

  const sumStock = rows.reduce((s, v) => s + (parseInt(v.stockQty, 10) || 0), 0);
  const minPrice = rows.length ? Math.min(...rows.map((v) => tryToMinor(v.price))) : undefined;
  const maxCompare = rows.reduce<number | null>((m, v) => {
    if (!v.compareAt) return m;
    const c = tryToMinor(v.compareAt);
    return m == null || c > m ? c : m;
  }, null);

  if (rows.length) {
    await tx.storeProduct.update({
      where: { id: productId },
      data: {
        stockQty: sumStock,
        ...(minPrice != null ? { priceMinor: minPrice } : {}),
        ...(maxCompare != null ? { compareAtMinor: maxCompare } : {}),
      },
    });
  }
}

export function emptyVariantRow(): VariantFormRow {
  return { label: "", price: "", compareAt: "", stockQty: "0", sku: "", isDefault: false };
}
