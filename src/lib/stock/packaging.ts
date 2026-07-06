import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ensureFinishedStockItemForProduct,
  recordStockMovement,
  StockError,
} from "@/lib/stock/movements";

type Db = PrismaClient | Prisma.TransactionClient;

export async function runPackaging(
  tx: Db,
  params: {
    siteId: string;
    recipeId?: string | null;
    outputProductId: string;
    outputVariantId?: string | null;
    outputQty: number;
    occurredAt?: Date;
    note?: string | null;
    staffUserId?: string | null;
  },
) {
  const qty = Math.max(1, Math.trunc(params.outputQty));
  const recipe = params.recipeId
    ? await tx.productRecipe.findFirst({
        where: { id: params.recipeId, siteId: params.siteId, active: true },
        include: { lines: { include: { stockItem: true }, orderBy: { sortOrder: "asc" } } },
      })
    : null;

  if (params.recipeId && !recipe) throw new StockError("Reçete bulunamadı.");
  if (recipe && recipe.outputProductId !== params.outputProductId) {
    throw new StockError("Reçete çıktı ürünü eşleşmiyor.");
  }

  const run = await tx.packagingRun.create({
    data: {
      siteId: params.siteId,
      recipeId: recipe?.id ?? null,
      outputProductId: params.outputProductId,
      outputVariantId: params.outputVariantId ?? null,
      outputQty: qty,
      occurredAt: params.occurredAt ?? new Date(),
      note: params.note?.trim() || null,
      staffUserId: params.staffUserId ?? null,
    },
  });

  const lines = recipe?.lines ?? [];
  if (!lines.length) throw new StockError("Reçetede girdi satırı yok.");

  for (const line of lines) {
    const need = line.qtyBasePerOutput * qty;
    await recordStockMovement(tx, {
      siteId: params.siteId,
      stockItemId: line.stockItemId,
      type: "production_out",
      qtyBase: -need,
      refType: "packaging",
      refId: run.id,
      lineKey: `in:${line.id}`,
      occurredAt: run.occurredAt,
      staffUserId: params.staffUserId,
      note: params.note ?? undefined,
    });
  }

  const outputItem = await ensureFinishedStockItemForProduct(
    tx,
    params.siteId,
    params.outputProductId,
    params.outputVariantId,
  );

  await recordStockMovement(tx, {
    siteId: params.siteId,
    stockItemId: outputItem.id,
    type: "production_in",
    qtyBase: qty,
    refType: "packaging",
    refId: run.id,
    lineKey: "out",
    occurredAt: run.occurredAt,
    staffUserId: params.staffUserId,
    note: params.note ?? undefined,
  });

  return run;
}

export async function loadRecipesForSite(siteId: string, prisma: PrismaClient) {
  return prisma.productRecipe.findMany({
    where: { siteId, active: true },
    include: {
      outputProduct: { select: { id: true, title: true, sku: true } },
      lines: {
        include: { stockItem: { select: { id: true, name: true, unit: true, balanceBase: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
