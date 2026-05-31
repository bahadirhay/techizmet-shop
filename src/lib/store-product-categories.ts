import type { Prisma, PrismaClient } from "@prisma/client";

export type ProductDb = Prisma.TransactionClient | PrismaClient;

function parseCategoryIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function unique(ids: string[]) {
  return [...new Set(ids)];
}

export async function resolveProductCategorySelection(
  tx: ProductDb,
  siteId: string,
  input: {
    categoryId?: unknown;
    categoryIds?: unknown;
  },
) {
  const legacyPrimary = typeof input.categoryId === "string" ? input.categoryId.trim() : "";
  const requestedIds = unique([...parseCategoryIds(input.categoryIds), ...(legacyPrimary ? [legacyPrimary] : [])]);
  if (!requestedIds.length) {
    return { primaryCategoryId: null, categoryIds: [] as string[] };
  }

  const categories = await tx.storeCategory.findMany({
    where: { siteId, id: { in: requestedIds } },
    select: { id: true },
  });
  if (categories.length !== requestedIds.length) {
    const found = new Set(categories.map((category) => category.id));
    const missing = requestedIds.filter((id) => !found.has(id));
    throw new Error(
      "Geçersiz kategori seçimi. Sayfayı yenileyip kategorileri tekrar seçin." +
        (missing.length ? ` (eksik: ${missing.length})` : ""),
    );
  }

  const validIds = requestedIds.filter((id) => categories.some((category) => category.id === id));
  const primaryCategoryId = legacyPrimary && validIds.includes(legacyPrimary) ? legacyPrimary : (validIds[0] ?? null);

  return { primaryCategoryId, categoryIds: validIds };
}

export async function syncProductCategoryLinks(
  tx: ProductDb,
  productId: string,
  categoryIds: string[],
) {
  await tx.storeProductCategory.deleteMany({ where: { productId } });
  if (!categoryIds.length) return;
  await tx.storeProductCategory.createMany({
    data: categoryIds.map((categoryId, index) => ({
      productId,
      categoryId,
      sortOrder: index,
    })),
  });
}
